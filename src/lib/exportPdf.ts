const safeName=(value:string)=>value.trim().replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'folion-output'

export async function exportA4Pages(container:HTMLElement,title:string){
 const [{default:html2canvas},{jsPDF}]=await Promise.all([import('html2canvas'),import('jspdf')])
 const pages=[...container.querySelectorAll<HTMLElement>('.sv2-page')]
 if(!pages.length)throw new Error('No finished pages are available to export.')
 const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true})
 for(const [index,page] of pages.entries()){
  if(index)pdf.addPage('a4','portrait')
  const canvas=await html2canvas(page,{backgroundColor:'#ffffff',scale:2,useCORS:true,logging:false,width:page.scrollWidth,height:page.scrollHeight})
  pdf.addImage(canvas.toDataURL('image/jpeg',.92),'JPEG',0,0,210,297,undefined,'FAST')
 }
 pdf.save(`${safeName(title)}.pdf`)
}
