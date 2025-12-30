import React, { useState, useRef, useEffect } from 'react';

// 添加类型声明，只解决编译错误
declare global {
  interface Window {
    html2canvas?: any;
    jspdf?: any;
  }
}

// PDF历史记录类型
interface PDFHistoryItem {
  id: string;
  filename: string;
  mawb: string;
  type: 'GEMINI' | 'CES';
  timestamp: number;
  pdfData: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CES' | 'gemini'>('CES');
  const [isExpanded, setIsExpanded] = useState(true);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const cesPrintRef = useRef<HTMLDivElement>(null);
  
  // PDF历史记录状态
  const [pdfHistory, setPdfHistory] = useState<PDFHistoryItem[]>([]);

  // 从localStorage加载历史记录
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pdfHistory');
      if (saved) {
        setPdfHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('加载PDF历史记录失败:', e);
    }
  }, []);

  // 保存历史记录到localStorage
  const savePdfToHistory = (filename: string, mawb: string, type: 'GEMINI' | 'CES', pdfData: string) => {
    const newItem: PDFHistoryItem = {
      id: Date.now().toString(),
      filename,
      mawb,
      type,
      timestamp: Date.now(),
      pdfData
    };
    
    setPdfHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 20); // 保留最近10个
      try {
        localStorage.setItem('pdfHistory', JSON.stringify(updated));
      } catch (e) {
        console.error('保存PDF历史记录失败:', e);
      }
      return updated;
    });
  };

  // 下载历史PDF
  const downloadHistoryPdf = (item: PDFHistoryItem) => {
    const link = document.createElement('a');
    link.href = item.pdfData;
    link.download = item.filename;
    link.click();
  };

  
  useEffect(() => {
    const loadScripts = async () => {
      
      const html2canvasScript = document.createElement('script');
      html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      
      
      const jsPDFScript = document.createElement('script');
      jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      
      
      document.head.appendChild(html2canvasScript);
      document.head.appendChild(jsPDFScript);
      
      
      await Promise.all([
        new Promise<void>(resolve => { html2canvasScript.onload = () => resolve(); }),
        new Promise<void>(resolve => { jsPDFScript.onload = () => resolve(); })
      ]);
      
      setScriptsLoaded(true);
    };
    
    loadScripts();
  }, []);
 
  const fields = [
    'Date',
    'From', 
    'Trucking',
    'MAWB',
    'BUP Info1',
    'BUP Info2',
    'BUP Info3',
    'Flight No',
    'Cartons Count1',
    'Cartons Count2',
    'Cartons Count3',
    'Weight',
    'Consignor',
  ];

  
  const truckingOptions = ["AGI", "AZAZ", "BO", "FARO", "GEANTOS", "GLOBAL", "SCAL", "TOP SERVICE", "TRESPORT"];
  const consignorOptions = ["SHEIN", "TEMU", "GIA", "TWTH", "CUPSHE", "4PX EXPRESS", "PRO CARRIER", "LIBERTY EXPRESS", "CNE EXPRESS", "FLYFLY", "FLYFLOW", "XINSHU", "WOOOLINK", "LANGZ INC.", "ZHONGSHU", "AGS SZX", "AGS PVG", "JS INTERNATIONAL", "EVERGLORY"];
  const fromOptions = ["AGI 1717", "AGI 513", "AGI 516", "AGI 517","AGI 836", "AGI 837", "WFS 838", "WFS 514", "AIR GENERAL", "AMERICAN", "CHOICE", "FARO", "MAERSK", "NCA", "SWISSPORT"];
 
  // GEMINI 表单数据
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const now = new Date();
    const cstDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    const defaultDate = cstDate.toISOString().split('T')[0];
    return {
      'Date': defaultDate
    };
  });

  // CES 表单数据
  const [cesFormData, setCesFormData] = useState<Record<string, string>>(() => {
    const now = new Date();
    const cstDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    const defaultDate = cstDate.toISOString().split('T')[0];
    return {
      'Date': defaultDate
    };
  });
 
  const handleChange = (label: string, value: string) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
  };

  const handleCESChange = (label: string, value: string) => {
    setCesFormData((prev) => ({ ...prev, [label]: value }));
  };

  const handleReset = () => {
    if (activeTab === 'gemini') {
      setFormData({});
    } else {
      setCesFormData({});
    }
  };
 
  const handlePrint = async () => {
    const currentPrintRef = activeTab === 'gemini' ? printRef : cesPrintRef;
    const currentFormData = activeTab === 'gemini' ? formData : cesFormData;

    if (!currentPrintRef.current) return;

    if (!scriptsLoaded) {
      alert('PDF库正在加载中，请稍候再试');
      return;
    }

    try {
      
      const canvas = await window.html2canvas(currentPrintRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0,
        removeContainer: true
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter',
        compress: true
      });
      
      
      pdf.addImage(imgData, 'JPEG', 0, 0, 8.5, 11);
      
      
      const mawb = currentFormData['MAWB'] || 'unnamed';
      const suffix = activeTab === 'gemini' ? 'GEMINI' : 'CES';
      const filename = `${mawb}_${suffix}_PTT.pdf`;
      
      // 获取PDF数据用于历史记录
      const pdfData = pdf.output('datauristring');
      
      // 保存到历史记录
      savePdfToHistory(filename, mawb, suffix, pdfData);
      
      pdf.save(filename);
      
    } catch (error) {
      console.error('生成 PDF 时出错:', error);
      
      
      const printWindow: Window | null = window.open('', '_blank');
      if (printWindow && currentPrintRef.current) {
        const printContent = currentPrintRef.current.innerHTML;
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${currentFormData['MAWB'] || 'PTT'} Document</title>
            <style>
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
              @media print {
                body { -webkit-print-color-adjust: exact; }
                @page { margin: 0.5in; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
          </html>
        `);
        
        printWindow.document.close();
        
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
      
      alert('PDF生成失败，已打开打印窗口，请选择"另存为PDF"');
    }
  };

  const renderDropdownInput = (label: string, options: string[], isCES: boolean = false) => {
    const currentFormData = isCES ? cesFormData : formData;
    const handleInputChange = isCES ? handleCESChange : handleChange;
    
    return (
      <div style={{ position: 'relative', flex: 1 }}>
        <input
          type="text"
          value={currentFormData[label] || ''}
          onChange={(e) => handleInputChange(label, e.target.value)}
          list={`${isCES ? 'ces-' : ''}${label}-options`}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            transition: 'border-color 0.3s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
          onBlur={(e) => e.target.style.borderColor = '#ddd'}
        />
        <datalist id={`${isCES ? 'ces-' : ''}${label}-options`}>
          {options.map((option, index) => (
            <option key={index} value={option} />
          ))}
        </datalist>
      </div>
    );
  };

  // ==================== CES Print Content ====================
  const renderCESPrintContent = () => (
    <div ref={cesPrintRef} className="ces-print-content" style={{ position: 'fixed', left: '-9999px', top: '0px', zIndex: -1000 }}>
      <div style={{
        width: '8.5in',
        height: '11in',
        padding: '0.4in',
        margin: '0 auto',
        background: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '1.2',
        color: '#000',
        boxSizing: 'border-box'
      }}>
        {/* Header with Logo */}
        <div style={{ position: 'relative', marginBottom: '35px', height: '80px' }}>
          <img 
            src="https://raw.githubusercontent.com/jun2369/MAWBchangenew/main/docs/c589ac709a4e12b3ba645999c32659e.png" 
            alt="Logo" 
            style={{
              width: '140px',
              position: 'absolute',
              left: '0',
              top: '0',
              marginTop:'-15px'
            }}
          />
          <h1 style={{ 
            fontSize: '26px', 
            fontWeight: 'bold',
            textAlign: 'center',
            marginLeft: '160px',
            paddingTop: '25px',
            letterSpacing: '0.5px'
          }}>
            GEMINI EXPRESS TRANSPORT CORP.
          </h1>
        </div>
 
        {/* DATE field */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', width: '80px' }}>DATE:</span>
          <span style={{
            borderBottom: '2px solid #000',
            display: 'inline-block',
            width: '300px',
            textAlign: 'center',
            fontSize: '16px',
            height: '23px',
            lineHeight: '23px'
          }}>
            {cesFormData['Date'] || ''}
          </span>
        </div>
 
 
        {/* Title */}
        <div style={{ 
          fontWeight: 'bold',
          marginBottom: '20px',
          fontSize: '13px',
          marginTop: '15px',
          
        }}>
          APPLICATION AND PERMIT TO TRANSFER CONTAINERIZED CARGO TO A CONTAINER STATION
        </div>
 
        {/* FROM field */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', width: '80px' }}>FROM:</span>
          <span style={{
            borderBottom: '2px solid #000',
            display: 'inline-block',
            width: '300px',
            textAlign: 'center',
            fontSize: '16px',
            height: '23px',
            lineHeight: '23px'
          }}>
            {cesFormData['From'] || ''}
          </span>
        </div>
 
 
        {/* TRUCKING field */}
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', width: '80px' }}>TRUCKING:</span>
          <span style={{
            borderBottom: '2px solid #000',
            display: 'inline-block',
            width: '300px',
            textAlign: 'center',
            fontSize: '16px',
            height: '23px',
            lineHeight: '23px'
          }}>
            {cesFormData['Trucking'] || ''}
          </span>
        </div>
 
 
        {/* To: section */}
        <div style={{ 
          marginBottom: '15px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'baseline'
        }}>
          <span style={{ fontWeight: 'bold' }}>To: Channel Distribution Corp. FIRMS CODE: </span>
          <span style={{ fontSize: '36px', fontWeight: 'bold', marginLeft: '8px', lineHeight: '1' }}>I115</span>
        </div>

        {/* Description text */}
        <div style={{ 
          marginBottom: '15px',
          fontSize: '12px',
          lineHeight: '1.3'
        }}>
          TO: DISTRICT DIRECTOR OF CUSTOMS<br />
          APPLICATION IS MADE TO TRANSFER THE CONTAINERS AND THEIR CONTENTS LISTED BELOW TO<br />
          <strong>GEMINI EXPRESS TRANSPORT CORP.</strong> (CONTAINER STATION). AN ABSTRACT OF THE CARRIERS MANIFEST<br />
          COVERING THE CONTENTS IS ATTACHED.
        </div>

        {/* Table */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          marginBottom: '15px',
          border: '3px solid #000'
        }}>
          <thead>
            <tr>
              <th style={{
                border: '1px solid #000',
                padding: '6px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: '#fff',
                color: '#000'
              }}>ULD TYPE & NO</th>
              <th style={{
                border: '1px solid #000',
                padding: '6px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: '#fff',
                color: '#000'
              }}>NO. OF PCS</th>
              <th style={{
                border: '1px solid #000',
                padding: '6px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: '#fff',
                color: '#000',
                width: '100px'
              }}>CARRIER &<br />FLT NO.</th>
              <th style={{
                border: '1px solid #000',
                padding: '6px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: '#fff',
                color: '#000',
                width: '180px'
              }}>AWB NO.</th>
              <th style={{
                border: '1px solid #000',
                padding: '6px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: '#fff',
                color: '#000'
              }}>WEIGHT</th>
              <th style={{
                border: '1px solid #000',
                padding: '6px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: '#fff',
                color: '#000'
              }}>CONSIGNOR</th>
            </tr>
          </thead>
          <tbody>
            {/* First row - BUP Info1 data */}
            <tr>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                height: '35px',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {cesFormData['BUP Info1'] || ''}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {cesFormData['Cartons Count1'] || ''}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {cesFormData['Flight No'] || ''}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {cesFormData['MAWB'] || ''}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {cesFormData['Weight'] || ''}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {cesFormData['Consignor'] || ''}
              </td>
            </tr>
            {/* Second row - BUP Info2 data */}
            <tr>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                height: '35px',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {cesFormData['BUP Info2'] || ''}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {cesFormData['Cartons Count2'] || ''}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
            </tr>
            {/* Third row - BUP Info3 data */}
            <tr>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                height: '35px',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {cesFormData['BUP Info3'] || ''}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {cesFormData['Cartons Count3'] || ''}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
            </tr>
            {/* Fourth empty row */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '6px', height: '35px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
            </tr>
          </tbody>
        </table>
 
        {/* Footer text */}
        <div style={{ 
          fontSize: '11px',
          marginBottom: '10px'
        }}>
          <strong>DELIVERED TO: Channel Distribution Corp.</strong> 950 Supreme Drive Bensenville, IL 60106
        </div>

        <div style={{ 
          fontSize: '11px',
          marginBottom: '15px',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>IN APPARENT GOOD ORDER AND CONDITION EXCEPT AS NOTED</span>
          <span style={{ fontWeight: 'bold' }}>RETURN TO AIRLINE</span>
        </div>

        {/* Horizontal line between condition text and received box */}
        <div style={{ 
          borderTop: '1px solid #000', 
          marginBottom: '10px',
          marginTop: '25px'
        }} />


        {/* Received box */}
        <div style={{ 
          border: '2px solid #000', 
          padding: '12px',
          marginBottom: '20px',
          fontSize: '11px',
          marginTop: '35px',
        }}>
          <div style={{ display: 'table', width: '100%', marginBottom: '8px' }}>
            <div style={{ display: 'table-row' }}>
              <div style={{ display: 'table-cell', width: '100px' }}>
                <span style={{ fontWeight: 'bold' }}>Received By:</span>
              </div>
              <div style={{ display: 'table-cell', width: '240px' }}>
                <span style={{ 
                  borderBottom: '1px solid #000',
                  display: 'block',
                  width: '100%'
                }}>&nbsp;</span>
              </div>
              <div style={{ display: 'table-cell', width: '80px', paddingLeft: '40px' }}>
                <span style={{ fontWeight: 'bold' }}>Date/Time:</span>
              </div>
              <div style={{ display: 'table-cell' }}>
                <span style={{ 
                  borderBottom: '1px solid #000',
                  display: 'block',
                  width: '100%'
                }}>&nbsp;</span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'table', width: '100%', marginBottom: '8px' }}>
            <div style={{ display: 'table-row' }}>
              <div style={{ display: 'table-cell', width: '100px' }}>
                <span style={{ fontWeight: 'bold' }}>Loose pcs:</span>
              </div>
              <div style={{ display: 'table-cell', width: '240px' }}>
                <span style={{ 
                  borderBottom: '1px solid #000',
                  display: 'block',
                  width: '100%'
                }}>&nbsp;</span>
              </div>
              <div style={{ display: 'table-cell', width: '80px', paddingLeft: '40px' }}>
                <span style={{ fontWeight: 'bold' }}>No. of Pallets:</span>
              </div>
              <div style={{ display: 'table-cell' }}>
                <span style={{ 
                  borderBottom: '1px solid #000',
                  display: 'block',
                  width: '100%'
                }}>&nbsp;</span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'table', width: '100%' }}>
            <div style={{ display: 'table-row' }}>
              <div style={{ display: 'table-cell', width: '150px' }}>
                <span style={{ fontWeight: 'bold' }}>Breakdown Complete By:</span>
              </div>
              <div style={{ display: 'table-cell' }}>
                <span style={{ 
                  borderBottom: '1px solid #000',
                  display: 'block',
                  width: '200px'
                }}>&nbsp;</span>
              </div>
            </div>
          </div>
        </div>
      <div style={{ marginTop: '20px' }}>
        {/* Signature section */}
        {/* Glenn Wade signature as image */}
        <div style={{ marginBottom: '2px', marginTop: '-10px' }}>
          <img 
            src="https://raw.githubusercontent.com/jun2369/MAWBchangenew/main/docs/b134b076058df762f53148378855766.png"
            alt="Glenn Wade Signature"
            style={{ height: '35px' }}
          />
        </div>


          {/* Signature lines in two columns */}
          <div style={{ marginTop: '-5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '35px' }}>
              <div style={{ width: '48%' }}>
                <div style={{ borderBottom: '2px solid #000', marginBottom: '3px' }}>&nbsp;</div>
                <div style={{ fontSize: '9px', fontWeight: 'bold' }}>
                  SIGNATURE OF AUTHORIZED AGENT OF CONTAINER STATION
                </div>
              </div>
              <div style={{ width: '48%' }}>
                <div style={{ borderBottom: '2px solid #000', marginBottom: '3px' }}>&nbsp;</div>
                <div style={{ fontSize: '9px', fontWeight: 'bold' }}>
                  SIGNATURE OF AUTHORIZED AGENT OF CARRIER
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '48%' }}>
                <div style={{ borderBottom: '2px solid #000', marginBottom: '3px' }}>&nbsp;</div>
                <div style={{ fontSize: '9px', fontWeight: 'bold' }}>
                  SIGNATURE OF CARTMAN
                </div>
              </div>
              <div style={{ width: '48%' }}>
                <div style={{ borderBottom: '2px solid #000', marginBottom: '3px' }}>&nbsp;</div>
                <div style={{ fontSize: '9px', fontWeight: 'bold' }}>
                  SIGNATURE OF CONTAINER STATION OPERATOR
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ==================== GEMINI Print Content ====================
  const renderPrintContent = () => (
    <div ref={printRef} className="print-content" style={{ position: 'fixed', left: '-9999px', top: '0px', zIndex: -1000 }}>
      <div style={{
        width: '8.5in',
        height: '11in',
        padding: '0.4in',
        margin: '0 auto',
        background: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '1.2',
        color: '#000',
        boxSizing: 'border-box'
      }}>
        {/* Header with Logo */}
        <div style={{ position: 'relative', marginBottom: '35px', height: '80px' }}>
          <img 
            src="https://raw.githubusercontent.com/jun2369/MAWBchangenew/main/docs/c589ac709a4e12b3ba645999c32659e.png" 
            alt="Logo" 
            style={{
              width: '140px',
              position: 'absolute',
              left: '0',
              top: '0',
              marginTop:'-15px'
            }}
          />
          <h1 style={{ 
            fontSize: '26px', 
            fontWeight: 'bold',
            textAlign: 'center',
            marginLeft: '160px',
            paddingTop: '25px',
            letterSpacing: '0.5px'
          }}>
            GEMINI EXPRESS TRANSPORT CORP.
          </h1>
        </div>
 
        {/* DATE field */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', width: '80px' }}>DATE:</span>
          <span style={{
            borderBottom: '2px solid #000',
            display: 'inline-block',
            width: '300px',
            textAlign: 'center',
            fontSize: '16px',
            height: '23px',
            lineHeight: '23px'
          }}>
            {formData['Date'] || ''}
          </span>
        </div>
 
 
        {/* Title */}
        <div style={{ 
          fontWeight: 'bold',
          marginBottom: '20px',
          fontSize: '13px',
          marginTop: '15px',
          
        }}>
          APPLICATION AND PERMIT TO TRANSFER CONTAINERIZED CARGO TO A CONTAINER STATION
        </div>
 
        {/* FROM field */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', width: '80px' }}>FROM:</span>
          <span style={{
            borderBottom: '2px solid #000',
            display: 'inline-block',
            width: '300px',
            textAlign: 'center',
            fontSize: '16px',
            height: '23px',
            lineHeight: '23px'
          }}>
            {formData['From'] || ''}
          </span>
        </div>
 
 
        {/* TRUCKING field */}
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', width: '80px' }}>TRUCKING:</span>
          <span style={{
            borderBottom: '2px solid #000',
            display: 'inline-block',
            width: '300px',
            textAlign: 'center',
            fontSize: '16px',
            height: '23px',
            lineHeight: '23px'
          }}>
            {formData['Trucking'] || ''}
          </span>
        </div>
 
 
        {/* To: section */}
        <div style={{ 
          marginBottom: '15px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'baseline'
        }}>
          <span style={{ fontWeight: 'bold' }}>To: GEMINI EXPRESS TRANSPORT CORP. FIRMS CODE: </span>
          <span style={{ fontSize: '36px', fontWeight: 'bold', marginLeft: '8px', lineHeight: '1' }}>HBT1</span>
        </div>

        {/* Description text */}
        <div style={{ 
          marginBottom: '15px',
          fontSize: '12px',
          lineHeight: '1.3'
        }}>
          TO: DISTRICT DIRECTOR OF CUSTOMS<br />
          APPLICATION IS MADE TO TRANSFER THE CONTAINERS AND THEIR CONTENTS LISTED BELOW TO<br />
          <strong>GEMINI EXPRESS TRANSPORT CORP.</strong> (CONTAINER STATION). AN ABSTRACT OF THE CARRIERS MANIFEST<br />
          COVERING THE CONTENTS IS ATTACHED.
        </div>

        {/* Table */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          marginBottom: '15px',
          border: '3px solid #000'
        }}>
          <thead>
            <tr>
              <th style={{
                border: '1px solid #000',
                padding: '6px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: '#fff',
                color: '#000'
              }}>ULD TYPE & NO</th>
              <th style={{
                border: '1px solid #000',
                padding: '6px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: '#fff',
                color: '#000'
              }}>NO. OF PCS</th>
              <th style={{
                border: '1px solid #000',
                padding: '6px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: '#fff',
                color: '#000',
                width: '100px'
              }}>CARRIER &<br />FLT NO.</th>
              <th style={{
                border: '1px solid #000',
                padding: '6px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: '#fff',
                color: '#000',
                width: '180px'
              }}>AWB NO.</th>
              <th style={{
                border: '1px solid #000',
                padding: '6px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: '#fff',
                color: '#000'
              }}>WEIGHT</th>
              <th style={{
                border: '1px solid #000',
                padding: '6px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: '#fff',
                color: '#000'
              }}>CONSIGNOR</th>
            </tr>
          </thead>
          <tbody>
            {/* First row - BUP Info1 data */}
            <tr>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                height: '35px',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {formData['BUP Info1'] || ''}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {formData['Cartons Count1'] || ''}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {formData['Flight No'] || ''}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {formData['MAWB'] || ''}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {formData['Weight'] || ''}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {formData['Consignor'] || ''}
              </td>
            </tr>
            {/* Second row - BUP Info2 data */}
            <tr>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                height: '35px',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {formData['BUP Info2'] || ''}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {formData['Cartons Count2'] || ''}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
            </tr>
            {/* Third row - BUP Info3 data */}
            <tr>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                height: '35px',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {formData['BUP Info3'] || ''}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '6px', 
                textAlign: 'center',
                fontSize: '16px',
                color: '#000',
                backgroundColor: '#fff'
              }}>
                {formData['Cartons Count3'] || ''}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
            </tr>
            {/* Fourth empty row */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '6px', height: '35px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
              <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#fff' }}>&nbsp;</td>
            </tr>
          </tbody>
        </table>
 
        {/* Footer text */}
        <div style={{ 
          fontSize: '11px',
          marginBottom: '10px'
        }}>
          <strong>DELIVERED TO: GEMINI EXPRESS TRANSPORT CORP.</strong> 2701 BUSSE ROAD, Elk Grove, IL 60007
        </div>

        <div style={{ 
          fontSize: '11px',
          marginBottom: '15px',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>IN APPARENT GOOD ORDER AND CONDITION EXCEPT AS NOTED</span>
          <span style={{ fontWeight: 'bold' }}>RETURN TO AIRLINE</span>
        </div>

        {/* Horizontal line between condition text and received box */}
        <div style={{ 
          borderTop: '1px solid #000', 
          marginBottom: '10px',
          marginTop: '25px'
        }} />


        {/* Received box */}
        <div style={{ 
          border: '2px solid #000', 
          padding: '12px',
          marginBottom: '20px',
          fontSize: '11px',
          marginTop: '35px',
        }}>
          <div style={{ display: 'table', width: '100%', marginBottom: '8px' }}>
            <div style={{ display: 'table-row' }}>
              <div style={{ display: 'table-cell', width: '100px' }}>
                <span style={{ fontWeight: 'bold' }}>Received By:</span>
              </div>
              <div style={{ display: 'table-cell', width: '240px' }}>
                <span style={{ 
                  borderBottom: '1px solid #000',
                  display: 'block',
                  width: '100%'
                }}>&nbsp;</span>
              </div>
              <div style={{ display: 'table-cell', width: '80px', paddingLeft: '40px' }}>
                <span style={{ fontWeight: 'bold' }}>Date/Time:</span>
              </div>
              <div style={{ display: 'table-cell' }}>
                <span style={{ 
                  borderBottom: '1px solid #000',
                  display: 'block',
                  width: '100%'
                }}>&nbsp;</span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'table', width: '100%', marginBottom: '8px' }}>
            <div style={{ display: 'table-row' }}>
              <div style={{ display: 'table-cell', width: '100px' }}>
                <span style={{ fontWeight: 'bold' }}>Loose pcs:</span>
              </div>
              <div style={{ display: 'table-cell', width: '240px' }}>
                <span style={{ 
                  borderBottom: '1px solid #000',
                  display: 'block',
                  width: '100%'
                }}>&nbsp;</span>
              </div>
              <div style={{ display: 'table-cell', width: '80px', paddingLeft: '40px' }}>
                <span style={{ fontWeight: 'bold' }}>No. of Pallets:</span>
              </div>
              <div style={{ display: 'table-cell' }}>
                <span style={{ 
                  borderBottom: '1px solid #000',
                  display: 'block',
                  width: '100%'
                }}>&nbsp;</span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'table', width: '100%' }}>
            <div style={{ display: 'table-row' }}>
              <div style={{ display: 'table-cell', width: '150px' }}>
                <span style={{ fontWeight: 'bold' }}>Breakdown Complete By:</span>
              </div>
              <div style={{ display: 'table-cell' }}>
                <span style={{ 
                  borderBottom: '1px solid #000',
                  display: 'block',
                  width: '200px'
                }}>&nbsp;</span>
              </div>
            </div>
          </div>
        </div>
      <div style={{ marginTop: '20px' }}>
        {/* Signature section */}
        {/* Glenn Wade signature as image */}
        <div style={{ marginBottom: '2px', marginTop: '-10px' }}>
          <img 
            src="https://raw.githubusercontent.com/jun2369/MAWBchangenew/main/docs/b134b076058df762f53148378855766.png"
            alt="Glenn Wade Signature"
            style={{ height: '35px' }}
          />
        </div>


          {/* Signature lines in two columns */}
          <div style={{ marginTop: '-5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '35px' }}>
              <div style={{ width: '48%' }}>
                <div style={{ borderBottom: '2px solid #000', marginBottom: '3px' }}>&nbsp;</div>
                <div style={{ fontSize: '9px', fontWeight: 'bold' }}>
                  SIGNATURE OF AUTHORIZED AGENT OF CONTAINER STATION
                </div>
              </div>
              <div style={{ width: '48%' }}>
                <div style={{ borderBottom: '2px solid #000', marginBottom: '3px' }}>&nbsp;</div>
                <div style={{ fontSize: '9px', fontWeight: 'bold' }}>
                  SIGNATURE OF AUTHORIZED AGENT OF CARRIER
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '48%' }}>
                <div style={{ borderBottom: '2px solid #000', marginBottom: '3px' }}>&nbsp;</div>
                <div style={{ fontSize: '9px', fontWeight: 'bold' }}>
                  SIGNATURE OF CARTMAN
                </div>
              </div>
              <div style={{ width: '48%' }}>
                <div style={{ borderBottom: '2px solid #000', marginBottom: '3px' }}>&nbsp;</div>
                <div style={{ fontSize: '9px', fontWeight: 'bold' }}>
                  SIGNATURE OF CONTAINER STATION OPERATOR
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ==================== CES Form ====================
  const renderCESForm = () => {
    const nonBUPFields = fields.filter(field => !field.includes('BUP Info') && !field.includes('Cartons Count'));
    
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '30px', color: '#333' }}>CES PTT INFO FORM</h2>
        
        {/* Render non-BUP fields first */}
        {nonBUPFields.slice(0, 4).map((label, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <label style={{ 
              width: '140px',
              fontWeight: '500',
              color: '#555'
            }}>{label}:</label>
            {label === 'Trucking' ? (
              renderDropdownInput(label, truckingOptions, true)
            ) : label === 'From' ? (
              renderDropdownInput(label, fromOptions, true)
            ) : (
              <input
                type="text"
                value={cesFormData[label] || ''}
                onChange={(e) => handleCESChange(label, e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            )}
          </div>
        ))}

        {/* Render BUP Info and Cartons Count pairs */}
        {[1, 2, 3].map((num) => (
          <div
            key={`bup-cartons-${num}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
              gap: '16px'
            }}
          >
            {/* BUP Info */}
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <label style={{ 
                width: '140px',
                fontWeight: '500',
                color: '#555'
              }}>{`BUP Info${num}:`}</label>
              <input
                type="text"
                value={cesFormData[`BUP Info${num}`] || ''}
                onChange={(e) => handleCESChange(`BUP Info${num}`, e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>
            
            {/* Cartons Count */}
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <label style={{ 
                width: '140px',
                fontWeight: '500',
                color: '#555'
              }}>{`Cartons Count${num}:`}</label>
              <input
                type="text"
                value={cesFormData[`Cartons Count${num}`] || ''}
                onChange={(e) => handleCESChange(`Cartons Count${num}`, e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>
          </div>
        ))}


        {/* Render remaining fields */}
        {nonBUPFields.slice(4).map((label, idx) => (
          <div
            key={`remaining-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <label style={{ 
              width: '140px',
              fontWeight: '500',
              color: '#555'
            }}>{label}:</label>
            {label === 'Consignor' ? (
              renderDropdownInput(label, consignorOptions, true)
            ) : (
              <input
                type="text"
                value={cesFormData[label] || ''}
                onChange={(e) => handleCESChange(label, e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            )}
          </div>
        ))}

        <button
          onClick={handlePrint}
          style={{
            marginTop: '30px',
            width: '100%',
            padding: '12px 24px',
            backgroundColor: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '18px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.3s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF8C00'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
        >
          SUBMIT
        </button>
        
        <button
          onClick={handleReset}
          style={{
            marginTop: '15px',
            width: '100%',
            padding: '12px 24px',
            backgroundColor: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '18px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.3s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF8C00'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
        >
          RESET
        </button>
        
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            Note: Please click on "Submit" to export a PDF file.
          </p>
        </div>
      </div>
    );
  };

  // ==================== GEMINI Form ====================
  const renderForm = () => {
    const nonBUPFields = fields.filter(field => !field.includes('BUP Info') && !field.includes('Cartons Count'));
    
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '30px', color: '#333' }}>GEMINI PTT INFO FORM</h2>
        
        {/* Render non-BUP fields first */}
        {nonBUPFields.slice(0, 4).map((label, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <label style={{ 
              width: '140px',
              fontWeight: '500',
              color: '#555'
            }}>{label}:</label>
            {label === 'Trucking' ? (
              renderDropdownInput(label, truckingOptions)
            ) : label === 'From' ? (
              renderDropdownInput(label, fromOptions)
            ) : (
              <input
                type="text"
                value={formData[label] || ''}
                onChange={(e) => handleChange(label, e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            )}
          </div>
        ))}

        {/* Render BUP Info and Cartons Count pairs */}
        {[1, 2, 3].map((num) => (
          <div
            key={`bup-cartons-${num}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
              gap: '16px'
            }}
          >
            {/* BUP Info */}
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <label style={{ 
                width: '140px',
                fontWeight: '500',
                color: '#555'
              }}>{`BUP Info${num}:`}</label>
              <input
                type="text"
                value={formData[`BUP Info${num}`] || ''}
                onChange={(e) => handleChange(`BUP Info${num}`, e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>
            
            {/* Cartons Count */}
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <label style={{ 
                width: '140px',
                fontWeight: '500',
                color: '#555'
              }}>{`Cartons Count${num}:`}</label>
              <input
                type="text"
                value={formData[`Cartons Count${num}`] || ''}
                onChange={(e) => handleChange(`Cartons Count${num}`, e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>
          </div>
        ))}


        {/* Render remaining fields */}
        {nonBUPFields.slice(4).map((label, idx) => (
          <div
            key={`remaining-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <label style={{ 
              width: '140px',
              fontWeight: '500',
              color: '#555'
            }}>{label}:</label>
            {label === 'Consignor' ? (
              renderDropdownInput(label, consignorOptions)
            ) : (
              <input
                type="text"
                value={formData[label] || ''}
                onChange={(e) => handleChange(label, e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            )}
          </div>
        ))}

        <button
          onClick={handlePrint}
          style={{
            marginTop: '30px',
            width: '100%',
            padding: '12px 24px',
            backgroundColor: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '18px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.3s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF8C00'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
        >
          SUBMIT
        </button>
        
        <button
          onClick={handleReset}
          style={{
            marginTop: '15px',
            width: '100%',
            padding: '12px 24px',
            backgroundColor: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '18px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.3s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF8C00'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
        >
          RESET
        </button>
        
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            Note: Please click on "Submit" to export a PDF file.
          </p>
        </div>
      </div>
    );
  };
 
  const menuItems = [
    
    { key: 'gemini', label: 'GEMINI PTT' },
    { key: 'CES', label: 'CES PTT' }
  ];
 
  return (
    <>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar */}
        <div
          style={{
            width: '200px',
            background: 'linear-gradient(to bottom, #182086, #D7D6F6, #182086)',
            color: '#fff',
            padding: '30px 20px',
          }}
        >
          <h3 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ 
              marginBottom: '30px', 
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none'
            }}
          >
            PTT
            <span style={{
              display: 'inline-block',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
              fontSize: '14px'
            }}>
              ▶
            </span>
          </h3>
          {isExpanded && menuItems.map((item) => (
            <div
              key={item.key}
              onClick={() => setActiveTab(item.key as 'CES' | 'gemini')}
              style={{
                marginBottom: '20px',
                padding: '10px 15px',
                cursor: 'pointer',
                borderRadius: '4px',
                backgroundColor: activeTab === item.key ? 'rgba(255,255,255,0.2)' : 'transparent',
                fontWeight: activeTab === item.key ? 'bold' : 'normal',
                transition: 'background-color 0.3s',
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
 
        {/* Content */}
        <div style={{ 
          flex: 1, 
          background: '#f7f8fa', 
          padding: '40px',
          overflowY: 'auto'
        }}>
          {activeTab === 'CES' ? (
            renderCESForm()
          ) : (
            renderForm()
          )}
        </div>

        {/* PDF History Panel */}
        <div style={{
          width: '280px',
          background: '#fff',
          borderLeft: '1px solid #e5e7eb',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <h3 style={{ 
            marginBottom: '20px', 
            fontSize: '16px', 
            color: '#333',
            fontWeight: '600',
            borderBottom: '2px solid #4f46e5',
            paddingBottom: '10px'
          }}>
            📄 PDF History (Recent 20)
          </h3>
          
          {pdfHistory.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#999', 
              fontSize: '14px',
              marginTop: '40px'
            }}>
              No PDF generated yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pdfHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => downloadHistoryPdf(item)}
                  style={{
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: '1px solid #e5e7eb',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#eef2ff';
                    e.currentTarget.style.borderColor = '#4f46e5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <div style={{ 
                    fontSize: '13px', 
                    fontWeight: '500', 
                    color: '#333',
                    marginBottom: '4px',
                    wordBreak: 'break-all'
                  }}>
                    {item.filename}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#666',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: item.type === 'GEMINI' ? '#dbeafe' : '#dcfce7',
                      color: item.type === 'GEMINI' ? '#1d4ed8' : '#166534',
                      fontSize: '10px',
                      fontWeight: '500'
                    }}>
                      {item.type}
                    </span>
                    <span>
                      {new Date(item.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* 打印内容 - GEMINI */}
      {renderPrintContent()}
      
      {/* 打印内容 - CES */}
      {renderCESPrintContent()}
    </>
  );
};
 
export default App;