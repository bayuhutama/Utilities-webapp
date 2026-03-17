import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Home from "@/pages/Home";
import PdfMerge from "@/features/pdf-merge/PdfMerge";
import CompressPdf from "@/features/compress-pdf/CompressPdf";
import CompressImage from "@/features/compress-image/CompressImage";
import TextDiff from "@/features/text-diff/TextDiff";
import TextBeautify from "@/features/text-beautify/TextBeautify";
import Base64 from "@/features/base64/Base64";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="pdf-merge" element={<PdfMerge />} />
          <Route path="compress-pdf" element={<CompressPdf />} />
          <Route path="compress-image" element={<CompressImage />} />
          <Route path="text-diff" element={<TextDiff />} />
          <Route path="text-beautify" element={<TextBeautify />} />
          <Route path="base64" element={<Base64 />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
