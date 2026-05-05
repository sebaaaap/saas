import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface ShareData {
    id: string;
    type: "quote" | "ot";
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    vehicle_plate: string;
    total: number;
}

export function usePdfShare() {
    const generateAndDownloadPDF = async (elementId: string, doc: ShareData): Promise<boolean> => {
        const element = document.getElementById(elementId);
        if (!element) {
            toast.error("Error al localizar el documento para PDF.");
            return false;
        }
        
        try {
            toast.info("Generando PDF del documento...");
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const canvas = await html2canvas(element, { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                backgroundColor: "#ffffff"
            });
            const imgData = canvas.toDataURL("image/jpeg", 1.0);
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
            
            const docTypeName = doc.type === "quote" ? "Cotizacion" : "OT";
            const filename = `${docTypeName}_${String(doc.id).slice(0, 6)}.pdf`;
            pdf.save(filename);
            
            return true;
        } catch (error) {
            console.error("Error generando PDF", error);
            return false;
        }
    };

    const handleWhatsAppShare = async (elementId: string, doc: ShareData) => {
        const phone = doc.customer_phone || "";
        const cleanPhone = phone.replace(/\D/g, "");
        if (!cleanPhone) {
            toast.error("El cliente no tiene un número de teléfono válido registrado.");
            return;
        }
        
        const pdfGenerated = await generateAndDownloadPDF(elementId, doc);
        
        if (pdfGenerated) {
            setTimeout(() => {
                const total = doc.total.toLocaleString("es-CL");
                const docType = doc.type === "quote" ? "Cotización" : "Orden de Trabajo";
                const text = `Hola ${doc.customer_name}, te enviamos el resumen de tu ${docType} (Ref: ${String(doc.id).slice(0, 4)}).\n\nTotal: $${total}\nVehículo: ${doc.vehicle_plate}\n\n*Por favor, revisa el archivo PDF adjunto.*\nQuedamos atentos a cualquier consulta.`;
                const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
                window.open(url, '_blank');
                toast.success("Abriendo WhatsApp. ¡Recuerda adjuntar el PDF descargado!");
            }, 1000);
        } else {
            toast.error("No se pudo generar el PDF para enviar");
        }
    };

    const handleEmailShare = async (elementId: string, doc: ShareData) => {
        const email = doc.customer_email || "";
        if (!email) {
            toast.error("El cliente no tiene un correo electrónico registrado.");
            return;
        }
        
        const pdfGenerated = await generateAndDownloadPDF(elementId, doc);
        
        if (pdfGenerated) {
            setTimeout(() => {
                const total = doc.total.toLocaleString("es-CL");
                const docType = doc.type === "quote" ? "Cotización" : "Orden de Trabajo";
                const subject = `${docType} - Ref: ${String(doc.id).slice(0, 4)}`;
                const body = `Hola ${doc.customer_name},\n\nTe enviamos el resumen de tu ${docType} (Ref: ${String(doc.id).slice(0, 4)}).\n\nTotal: $${total}\nVehículo: ${doc.vehicle_plate}\n\nPor favor revisa el archivo PDF que debes adjuntar a este correo.\n\nSaludos.`;
                const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.open(url, '_blank');
                toast.success("Abriendo correo. ¡Recuerda adjuntar el PDF descargado!");
            }, 1000);
        } else {
            toast.error("No se pudo generar el PDF para enviar");
        }
    };

    return { generateAndDownloadPDF, handleWhatsAppShare, handleEmailShare };
}
