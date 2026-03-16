package com.utilkit.backend.controller;

import com.utilkit.backend.service.ConversionService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/convert")
public class ConvertController {

    private final ConversionService conversionService;

    public ConvertController(ConversionService conversionService) {
        this.conversionService = conversionService;
    }

    @PostMapping("/pdf-to-docx")
    public ResponseEntity<byte[]> pdfToDocx(@RequestParam("file") MultipartFile file) {
        validateExtension(file, "pdf");
        try {
            byte[] result = conversionService.convertPdfToDocx(file);
            String filename = stripExtension(file.getOriginalFilename()) + ".docx";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                    .body(result);
        } catch (IOException | InterruptedException e) {
            return ResponseEntity.internalServerError()
                    .body(("Conversion failed: " + e.getMessage()).getBytes());
        }
    }

    @PostMapping("/docx-to-pdf")
    public ResponseEntity<byte[]> docxToPdf(@RequestParam("file") MultipartFile file) {
        validateExtension(file, "docx", "doc");
        try {
            byte[] result = conversionService.convertDocxToPdf(file);
            String filename = stripExtension(file.getOriginalFilename()) + ".pdf";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(result);
        } catch (IOException | InterruptedException e) {
            return ResponseEntity.internalServerError()
                    .body(("Conversion failed: " + e.getMessage()).getBytes());
        }
    }

    private void validateExtension(MultipartFile file, String... allowed) {
        String name = file.getOriginalFilename();
        if (name == null) return;
        String ext = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase() : "";
        for (String a : allowed) {
            if (a.equals(ext)) return;
        }
        throw new IllegalArgumentException("Unsupported file type: " + ext);
    }

    private String stripExtension(String filename) {
        if (filename == null) return "converted";
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(0, dot) : filename;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadInput(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
    }
}
