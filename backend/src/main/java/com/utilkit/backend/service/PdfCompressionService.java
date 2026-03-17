package com.utilkit.backend.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.JPEGFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdfwriter.compress.CompressParameters;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.stream.IntStream;

@Service
public class PdfCompressionService {

    private static final Logger log = LoggerFactory.getLogger(PdfCompressionService.class);

    public record CompressionResult(
            byte[] bytes,
            long originalSize,
            long compressedSize,
            boolean reduced
    ) {}

    public CompressionResult compress(byte[] inputBytes, int quality) throws IOException {
        long originalSize = inputBytes.length;

        byte[] compressed = (quality >= 85)
                ? compressStructural(inputBytes)
                : compressRasterize(inputBytes, quality);

        log.info("Compressed size: {} bytes (original: {} bytes)", compressed.length, originalSize);

        if (compressed.length < originalSize) {
            return new CompressionResult(compressed, originalSize, compressed.length, true);
        } else {
            log.info("No size reduction achieved — returning original");
            return new CompressionResult(inputBytes, originalSize, compressed.length, false);
        }
    }

    // ── High quality: structural compression only, no rasterization ──────────

    private byte[] compressStructural(byte[] inputBytes) throws IOException {
        log.info("Strategy: STRUCTURAL (High quality) — re-encoding image XObjects + stream compression");

        try (PDDocument doc = Loader.loadPDF(inputBytes)) {
            for (PDPage page : doc.getPages()) {
                reencodePageImages(doc, page);
            }
            doc.setDocumentInformation(new PDDocumentInformation());
            doc.getDocumentCatalog().setMetadata(null);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos, CompressParameters.DEFAULT_COMPRESSION);
            return baos.toByteArray();
        }
    }

    private void reencodePageImages(PDDocument doc, PDPage page) {
        PDResources resources = page.getResources();
        if (resources == null) return;

        float pageWidthInches = page.getMediaBox().getWidth() / 72f;
        if (pageWidthInches <= 0) return;

        for (COSName name : resources.getXObjectNames()) {
            try {
                PDXObject xObj = resources.getXObject(name);
                if (!(xObj instanceof PDImageXObject image)) continue;

                BufferedImage bi = image.getImage();
                if (bi == null) continue;

                // Downsample if above 150 DPI; otherwise re-encode at original size
                float currentDPI = image.getWidth() / pageWidthInches;
                float scale      = Math.min(1.0f, 150f / currentDPI);
                int newWidth     = Math.max(1, Math.round(image.getWidth()  * scale));
                int newHeight    = Math.max(1, Math.round(image.getHeight() * scale));

                BufferedImage out = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
                Graphics2D g2d = out.createGraphics();
                g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                g2d.setBackground(Color.WHITE);
                g2d.clearRect(0, 0, newWidth, newHeight);
                g2d.drawImage(bi, 0, 0, newWidth, newHeight, null);
                g2d.dispose();

                long originalBytes  = readStreamSize(image);
                PDImageXObject reencoded = JPEGFactory.createFromImage(doc, out, 0.75f);
                long reencodedBytes = readStreamSize(reencoded);

                if (reencodedBytes > 0 && reencodedBytes < originalBytes) {
                    resources.put(name, reencoded);
                    log.debug("Re-encoded image '{}': {} → {} bytes", name.getName(), originalBytes, reencodedBytes);
                }
            } catch (Exception e) {
                log.debug("Skipping image '{}': {}", name.getName(), e.getMessage());
            }
        }
    }

    private long readStreamSize(PDImageXObject image) {
        try (InputStream is = image.getCOSObject().createRawInputStream()) {
            return is.transferTo(OutputStream.nullOutputStream());
        } catch (IOException e) {
            return 0;
        }
    }

    // ── Low / Medium: rasterize every page via PDFRenderer ───────────────────

    private byte[] compressRasterize(byte[] inputBytes, int quality) throws IOException {
        float targetDPI   = (quality <= 30) ? 60f  : 72f;
        float jpegQuality = (quality <= 30) ? 0.3f : 0.5f;

        try (PDDocument inputDoc = Loader.loadPDF(inputBytes);
             PDDocument outputDoc = new PDDocument()) {

            int pageCount = inputDoc.getNumberOfPages();
            log.info("Strategy: RASTERIZE — {} pages, quality={}, dpi={}, jpegQuality={}",
                    pageCount, quality, targetDPI, jpegQuality);

            final byte[] bytesRef = inputBytes;
            final float  dpiRef   = targetDPI;

            // Render pages in parallel — each thread loads its own PDDocument
            BufferedImage[] pages = IntStream.range(0, pageCount)
                    .parallel()
                    .mapToObj(i -> {
                        try (PDDocument td = Loader.loadPDF(bytesRef)) {
                            return new PDFRenderer(td).renderImageWithDPI(i, dpiRef, ImageType.RGB);
                        } catch (IOException e) {
                            throw new RuntimeException("Failed to render page " + i, e);
                        }
                    })
                    .toArray(BufferedImage[]::new);

            // Build output PDF sequentially (PDDocument is not thread-safe)
            for (int i = 0; i < pageCount; i++) {
                PDPage newPage = new PDPage(inputDoc.getPage(i).getMediaBox());
                outputDoc.addPage(newPage);

                PDImageXObject img = JPEGFactory.createFromImage(outputDoc, pages[i], jpegQuality);
                try (PDPageContentStream cs = new PDPageContentStream(outputDoc, newPage)) {
                    cs.drawImage(img, 0, 0, newPage.getMediaBox().getWidth(), newPage.getMediaBox().getHeight());
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            outputDoc.save(baos);
            return baos.toByteArray();
        }
    }
}
