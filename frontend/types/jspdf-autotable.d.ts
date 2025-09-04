declare module "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
      [key: string]: any;
    };
  }
}
