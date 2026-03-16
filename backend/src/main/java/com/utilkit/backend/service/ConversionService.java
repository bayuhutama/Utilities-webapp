package com.utilkit.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class ConversionService {

    @Value("${utilkit.libreoffice.path:}")
    private String libreOfficePath;

    public byte[] convertPdfToDocx(MultipartFile file) throws IOException, InterruptedException {
        return convert(file, "docx");
    }

    public byte[] convertDocxToPdf(MultipartFile file) throws IOException, InterruptedException {
        return convert(file, "pdf");
    }

    private byte[] convert(MultipartFile file, String targetFormat) throws IOException, InterruptedException {
        Path tempDir = Files.createTempDirectory("utilkit-convert-");
        try {
            // Write uploaded file to temp dir
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "input";
            Path inputFile = tempDir.resolve(originalName);
            file.transferTo(inputFile);

            // Run LibreOffice headless conversion
            String soffice = resolveLibreOfficeBin();
            ProcessBuilder pb = new ProcessBuilder(
                    soffice,
                    "--headless",
                    "--norestore",
                    "--convert-to", targetFormat,
                    "--outdir", tempDir.toString(),
                    inputFile.toString()
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();
            String output = new String(process.getInputStream().readAllBytes());
            boolean finished = process.waitFor(60, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                throw new IOException("LibreOffice conversion timed out after 60 seconds.");
            }
            if (process.exitValue() != 0) {
                throw new IOException("LibreOffice conversion failed:\n" + output);
            }

            // Find output file (LibreOffice replaces extension)
            String baseName = originalName.contains(".")
                    ? originalName.substring(0, originalName.lastIndexOf('.'))
                    : originalName;
            Path outputFile = tempDir.resolve(baseName + "." + targetFormat);

            if (!Files.exists(outputFile)) {
                // Fallback: find any file with target extension
                outputFile = Files.list(tempDir)
                        .filter(p -> p.toString().endsWith("." + targetFormat))
                        .findFirst()
                        .orElseThrow(() -> new IOException("Converted file not found. Output: " + output));
            }

            return Files.readAllBytes(outputFile);
        } finally {
            // Clean up temp directory
            try (var stream = Files.walk(tempDir)) {
                stream.sorted(java.util.Comparator.reverseOrder())
                        .forEach(p -> p.toFile().delete());
            }
        }
    }

    private String resolveLibreOfficeBin() throws IOException {
        // Use configured path if provided
        if (libreOfficePath != null && !libreOfficePath.isBlank()) {
            return libreOfficePath;
        }

        // Windows default locations
        List<String> candidates = List.of(
                "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
                "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
                "/usr/bin/libreoffice",
                "/usr/bin/soffice",
                "/Applications/LibreOffice.app/Contents/MacOS/soffice"
        );

        for (String candidate : candidates) {
            if (new java.io.File(candidate).exists()) {
                return candidate;
            }
        }

        throw new IOException(
                "LibreOffice not found. Install it from https://www.libreoffice.org " +
                "or set utilkit.libreoffice.path in application.yml"
        );
    }
}
