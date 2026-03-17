package com.utilkit.backend.controller;

import com.utilkit.backend.service.PdfCompressionService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/pdf")
public class PdfController {

    private final PdfCompressionService compressionService;

    public PdfController(PdfCompressionService compressionService) {
        this.compressionService = compressionService;
    }

    @PostMapping("/compress")
    public ResponseEntity<byte[]> compress(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "quality", defaultValue = "65") int quality) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("No file provided".getBytes());
        }

        String originalName = file.getOriginalFilename();
        if (originalName == null || !originalName.toLowerCase().endsWith(".pdf")) {
            return ResponseEntity.badRequest().body("Only PDF files are supported".getBytes());
        }

        try {
            byte[] inputBytes = file.getBytes();
            PdfCompressionService.CompressionResult result = compressionService.compress(inputBytes, quality);

            String baseName = originalName.contains(".")
                    ? originalName.substring(0, originalName.lastIndexOf('.'))
                    : originalName;
            String outName = result.reduced() ? baseName + "_compressed.pdf" : originalName;

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + outName + "\"")
                    .header("X-Compression-Result", result.reduced() ? "reduced" : "no-reduction")
                    .header("X-Original-Size",    String.valueOf(result.originalSize()))
                    .header("X-Compressed-Size",  String.valueOf(result.compressedSize()))
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(result.bytes());

        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(("Compression failed: " + e.getMessage()).getBytes());
        }
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadInput(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
    }
}
