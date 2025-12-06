import { useState, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { fabric } from "fabric";
import { saveAs } from "file-saver";

function App() {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const canvasRef = useRef(null);
  const fabricCanvas = useRef(null);

  const loadPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    setPdfDoc(pdf);
    setNumPages(pdf.getPageCount());
    setPageNum(0);
    renderPage(0, pdf, arrayBuffer);
  };

  const renderPage = async (pageIndex, pdf, originalBuffer) => {
    const page = pdf.getPage(pageIndex);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = canvasRef.current;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport }).promise;

    // Initialize fabric.js on top of the PDF canvas
    if (fabricCanvas.current) fabricCanvas.current.dispose();
    const fabCanvas = new fabric.Canvas(canvas, {
      isDrawingMode: true,
      backgroundImage: new fabric.Image(canvas, { selectable: false }),
    });
    fabricCanvas.current = fabCanvas;

    // Tools
    document.getElementById("freehand").onclick = () => {
      fabCanvas.isDrawingMode = true;
      fabCanvas.freeDrawingBrush.width = 3;
      fabCanvas.freeDrawingBrush.color = "#000000";
    };
    document.getElementById("text").onclick = () => {
      fabCanvas.isDrawingMode = false;
      const text = new fabric.IText("Click to edit", {
        left: 100,
        top: 100,
        fontSize: 20,
        fill: "#000",
      });
      fabCanvas.add(text);
    };
    document.getElementById("erase").onclick = () => {
      if (fabCanvas.getActiveObject()) {
        fabCanvas.remove(fabCanvas.getActiveObject());
      }
    };
  };

  const downloadPDF = async () => {
    if (!pdfDoc || !fabricCanvas.current) return;

    fabricCanvas.current.discardActiveObject();
    const dataUrl = fabricCanvas.current.toDataURL({ format: "png" });
    const imgBytes = await fetch(dataUrl).then(res => res.arrayBuffer());

    const newPdfDoc = await PDFDocument.create();
    const img = await newPdfDoc.embedPng(imgBytes);
    const page = newPdfDoc.addPage([canvasRef.current.width, canvasRef.current.height]);
    page.drawImage(img, {
      x: 0,
      y: 0,
      width: canvasRef.current.width,
      height: canvasRef.current.height,
    });

    const pdfBytes = await newPdfDoc.save();
    saveAs(new Blob([pdfBytes], { type: "application/pdf" }), "edited.pdf");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-6">Free PDF Editor</h1>

        <div className="mb-4 flex flex-wrap gap-4 justify-center">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => e.target.files[0] && loadPDF(e.target.files[0])}
            className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white"
          />
          <button id="freehand" className="px-4 py-2 bg-black text-white rounded">✏️ Draw</button>
          <button id="text" className="px-4 py-2 bg-green-600 text-white rounded">T Text</button>
          <button id="erase" className="px-4 py-2 bg-red-600 text-white rounded">🗑️ Delete Selected</button>
          <button onClick={downloadPDF} className="px-6 py-2 bg-purple-600 text-white rounded font-bold">
            💾 Download PDF
          </button>
        </div>

        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <canvas ref={canvasRef} className="mx-auto" />
        </div>

        {numPages > 0 && (
          <div className="text-center mt-4">
            Page {pageNum + 1} of {numPages}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;