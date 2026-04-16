import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PrintOptions {
  title?: string;
  subtitle?: string;
  filename?: string;
}

export const usePrintCanvas = () => {
  const { toast } = useToast();

  const printCanvas = useCallback((options: PrintOptions = {}) => {
    const { title = 'Workflow Canvas', subtitle, filename } = options;
    
    // Find the ReactFlow container
    const canvasElement = document.querySelector('.react-flow');
    if (!canvasElement) {
      toast({
        title: 'Error',
        description: 'No canvas found to print',
        variant: 'destructive',
      });
      return;
    }

    // Create a print-friendly version
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Error',
        description: 'Unable to open print window. Please allow popups.',
        variant: 'destructive',
      });
      return;
    }

    // Clone the canvas content
    const canvasClone = canvasElement.cloneNode(true) as HTMLElement;
    
    // Remove controls and minimap from the clone for cleaner print
    const controls = canvasClone.querySelector('.react-flow__controls');
    const minimap = canvasClone.querySelector('.react-flow__minimap');
    if (controls) controls.remove();
    if (minimap) minimap.remove();

    // Get computed styles
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch {
          return '';
        }
      })
      .join('\n');

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            ${styles}
            @media print {
              body { 
                margin: 0; 
                padding: 20px;
                background: white !important;
                color: black !important;
              }
              .print-header {
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 20px;
                border-bottom: 2px solid #eee;
              }
              .print-header h1 {
                font-size: 24px;
                margin: 0;
                color: #333;
              }
              .print-header p {
                font-size: 14px;
                color: #666;
                margin: 5px 0 0;
              }
              .print-footer {
                position: fixed;
                bottom: 20px;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 10px;
                color: #999;
              }
              .canvas-container {
                width: 100%;
                height: auto;
                overflow: visible;
              }
              .react-flow {
                height: auto !important;
                min-height: 600px;
              }
              .react-flow__node {
                background: white !important;
                border: 1px solid #333 !important;
              }
              .react-flow__edge path {
                stroke: #333 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${title}</h1>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
            <p style="font-size: 12px; color: #999; margin-top: 10px;">Generated on ${new Date().toLocaleString()}</p>
          </div>
          <div class="canvas-container">
            ${canvasClone.outerHTML}
          </div>
          <div class="print-footer">
            Smart Agents Platform - ${new Date().getFullYear()}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    toast({
      title: 'Print Ready',
      description: 'Print dialog should open shortly',
    });
  }, [toast]);

  const exportAsPDF = useCallback(async (options: PrintOptions = {}) => {
    const { title = 'Workflow Canvas', subtitle, filename = 'workflow-canvas' } = options;
    
    // For PDF export, we use the print functionality with PDF as printer
    // Modern browsers allow "Save as PDF" from the print dialog
    printCanvas({ title, subtitle, filename });
    
    toast({
      title: 'Export as PDF',
      description: 'Select "Save as PDF" in the print dialog to export',
    });
  }, [printCanvas, toast]);

  return { printCanvas, exportAsPDF };
};
