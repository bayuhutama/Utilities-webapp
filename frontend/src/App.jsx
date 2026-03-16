import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Home from "@/pages/Home";
import PdfMerge from "@/features/pdf-merge/PdfMerge";
import PdfConvert from "@/features/pdf-convert/PdfConvert";
import TextDiff from "@/features/text-diff/TextDiff";
import TextBeautify from "@/features/text-beautify/TextBeautify";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="pdf-merge" element={<PdfMerge />} />
          <Route path="pdf-convert" element={<PdfConvert />} />
          <Route path="text-diff" element={<TextDiff />} />
          <Route path="text-beautify" element={<TextBeautify />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
