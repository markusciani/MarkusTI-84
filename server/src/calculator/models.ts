export interface CalculatorModel {
  id: string;
  label: string;
  tiBasic: boolean;
  pythonHardware: boolean;
  programNameMaxLength: number;
  displayColumns: number;
  displayRows: number;
  availableBytes: number;
  recommendedProgramBytes: number;
}

export const calculatorModels: CalculatorModel[] = [
  {
    id: "TI-84 Evo", label: "TI-84 Evo", tiBasic: true, pythonHardware: true,
    programNameMaxLength: 8, displayColumns: 26, displayRows: 10,
    availableBytes: 3_500_000, recommendedProgramBytes: 180_000
  },
  {
    id: "TI-84 Plus CE", label: "TI-84 Plus CE", tiBasic: true, pythonHardware: false,
    programNameMaxLength: 8, displayColumns: 26, displayRows: 10,
    availableBytes: 3_000_000, recommendedProgramBytes: 180_000
  },
  {
    id: "TI-84 Plus CE Python", label: "TI-84 Plus CE Python", tiBasic: true, pythonHardware: true,
    programNameMaxLength: 8, displayColumns: 26, displayRows: 10,
    availableBytes: 3_000_000, recommendedProgramBytes: 180_000
  },
  {
    id: "TI-84 Plus", label: "TI-84 Plus / TI-83 Plus", tiBasic: true, pythonHardware: false,
    programNameMaxLength: 8, displayColumns: 16, displayRows: 8,
    availableBytes: 24_000, recommendedProgramBytes: 16_000
  }
];

export function getCalculatorModel(id: string): CalculatorModel | undefined {
  return calculatorModels.find((model) => model.id === id);
}
