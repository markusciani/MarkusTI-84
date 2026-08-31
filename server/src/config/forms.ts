import "../env.js";

export interface SelectedItemField { fieldId: string; label: string }

export type FormFieldConfig = Record<string, string>;

export interface FormConfig {
  formId: string;
  formName: string;
  formType: string;
  calculatorType: string;
  ticketType: string;
  ticketPrefix: string;
  numbersSheet: string;
  numbersTable: string;
  active: boolean;
  capabilities: { games: boolean; programs: boolean; python: boolean; gameLauncher: boolean };
  fields: FormFieldConfig;
  fieldLabels?: Record<string, string[]>;
  groups: {
    games: SelectedItemField[];
    programs: SelectedItemField[];
    gameMultiSelectFields?: string[];
    programMultiSelectFields?: string[];
    gameMatrixLabels?: string[];
    programMatrixLabels?: string[];
  };
  detailColumns: Record<string, string>;
}

const todo = (name: string) => name;

export const formConfigs: FormConfig[] = [
  {
    formId: process.env.TALLY_EVO_FORM_ID || "TODO_TALLY_EVO_FORM_ID",
    formName: "TI-84 Evo Ticket",
    formType: "evo",
    calculatorType: "TI-84 Evo",
    ticketType: "Game Ticket",
    ticketPrefix: "EVO",
    numbersSheet: "TI-84 Evo",
    numbersTable: "Tickets",
    active: true,
    capabilities: { games: true, programs: true, python: true, gameLauncher: false },
    fields: {
      firstName: todo("TODO_TALLY_EVO_FIRST_NAME_FIELD_ID"),
      phone: todo("TODO_TALLY_EVO_PHONE_FIELD_ID"),
      email: todo("TODO_TALLY_EVO_EMAIL_FIELD_ID"),
      grade: todo("TODO_TALLY_EVO_GRADE_FIELD_ID"),
      calculatorModel: todo("TODO_TALLY_EVO_CALCULATOR_MODEL_FIELD_ID"),
      version: todo("TODO_TALLY_EVO_VERSION_FIELD_ID"),
      python: todo("TODO_TALLY_EVO_PYTHON_FIELD_ID"),
      caseIncluded: todo("TODO_TALLY_EVO_CASE_INCLUDED_FIELD_ID"),
      chargerIncluded: todo("TODO_TALLY_EVO_CHARGER_INCLUDED_FIELD_ID"),
      cleanCase: todo("TODO_TALLY_EVO_CLEAN_CASE_FIELD_ID"),
      background: todo("TODO_TALLY_EVO_BACKGROUND_FIELD_ID"),
      delivery: todo("TODO_TALLY_EVO_DELIVERY_FIELD_ID"),
      printName: todo("TODO_TALLY_EVO_PRINT_NAME_FIELD_ID"),
      signature: todo("TODO_TALLY_EVO_SIGNATURE_FIELD_ID")
    },
    fieldLabels: {
      firstName: ["First Name"], phone: ["Phone Number"], email: ["Email Address"], grade: ["Grade Level"],
      version: ["Version Number"], python: ["Does your calculator have Python?"],
      caseIncluded: ["Does your calculator come with its case?"], chargerIncluded: ["Did your calculator come with its charger?"],
      cleanCase: ["Would you like us to clean your calculator’s case?", "Would you like us to clean your calculator's case?"],
      background: ["Would you like to have a custom background for your calculator?"],
      delivery: ["How would you like us to return your calculator?"], printName: ["Print Name"],
      signature: ["Signature Verification", "Signature"]
    },
    groups: {
      games: [
        { fieldId: todo("TODO_TALLY_EVO_GAME_SNAKE_FIELD_ID"), label: "Snake" },
        { fieldId: todo("TODO_TALLY_EVO_GAME_TETRIS_FIELD_ID"), label: "Tetris" },
        { fieldId: todo("TODO_TALLY_EVO_GAME_2048_FIELD_ID"), label: "2048" },
        { fieldId: todo("TODO_TALLY_EVO_GAME_PACMAN_FIELD_ID"), label: "Pac-Man" },
        { fieldId: todo("TODO_TALLY_EVO_GAME_WORDLE_FIELD_ID"), label: "Wordle" }
      ],
      programs: [
        { fieldId: todo("TODO_TALLY_EVO_PROGRAM_QUADRATIC_FIELD_ID"), label: "Quadratic Formula" },
        { fieldId: todo("TODO_TALLY_EVO_PROGRAM_RADICAL_FIELD_ID"), label: "Radical Simplifier" },
        { fieldId: todo("TODO_TALLY_EVO_PROGRAM_UNIT_CIRCLE_FIELD_ID"), label: "Unit Circle" }
      ],
      gameMultiSelectFields: [todo("TODO_TALLY_EVO_GAMES_MULTISELECT_FIELD_ID")],
      programMultiSelectFields: [todo("TODO_TALLY_EVO_PROGRAMS_MULTISELECT_FIELD_ID")],
      gameMatrixLabels: ["Games for TI-84 Evo"],
      programMatrixLabels: ["Math Programs for TI-84 Evo"]
    },
    detailColumns: {
      "Ticket ID": "ticketId", "Submitted": "submittedAt", "First Name": "person.firstName",
      "Phone": "person.phone", "Email": "person.email", "Grade": "person.grade",
      "Calculator Model": "calculator.model", "Version": "calculator.version",
      "Python": "calculator.python", "Case Included": "calculator.caseIncluded",
      "Charger Included": "calculator.chargerIncluded", "Clean Case": "options.cleanCase",
      "Background": "options.background", "Games Requested": "games",
      "Math Programs Requested": "programs", "Delivery": "delivery.option",
      "Print Name": "options.printName", "Signature Received": "options.signatureReceived",
      "Signature URL": "options.signatureUrl", "Status": "$status",
      "Tally Submission ID": "tallySubmissionId"
    }
  },
  {
    formId: process.env.TALLY_CE_FORM_ID || "TODO_TALLY_CE_FORM_ID",
    formName: "TI-84 Plus CE & Python Ticket",
    formType: "ce",
    calculatorType: "TI-84 Plus CE",
    ticketType: "Game Ticket",
    ticketPrefix: "CE",
    numbersSheet: "TI-84 Plus CE",
    numbersTable: "Tickets",
    active: true,
    capabilities: { games: true, programs: true, python: true, gameLauncher: true },
    fields: {
      firstName: todo("TODO_TALLY_CE_FIRST_NAME_FIELD_ID"),
      phone: todo("TODO_TALLY_CE_PHONE_FIELD_ID"),
      email: todo("TODO_TALLY_CE_EMAIL_FIELD_ID"),
      grade: todo("TODO_TALLY_CE_GRADE_FIELD_ID"),
      calculatorModel: todo("TODO_TALLY_CE_CALCULATOR_MODEL_FIELD_ID"),
      version: todo("TODO_TALLY_CE_VERSION_FIELD_ID"),
      python: todo("TODO_TALLY_CE_PYTHON_STATUS_FIELD_ID"),
      caseIncluded: todo("TODO_TALLY_CE_CASE_INCLUDED_FIELD_ID"),
      chargerIncluded: todo("TODO_TALLY_CE_CHARGER_INCLUDED_FIELD_ID"),
      dateTimeCurrent: todo("TODO_TALLY_CE_DATE_TIME_CURRENT_FIELD_ID"),
      cleanCase: todo("TODO_TALLY_CE_CLEAN_CASE_FIELD_ID"),
      background: todo("TODO_TALLY_CE_BACKGROUND_FIELD_ID"),
      gameLauncherMethod: todo("TODO_TALLY_CE_GAME_LAUNCHER_METHOD_FIELD_ID"),
      existingLauncherName: todo("TODO_TALLY_CE_EXISTING_LAUNCHER_NAME_FIELD_ID"),
      launcherScreenshot: todo("TODO_TALLY_CE_LAUNCHER_SCREENSHOT_FIELD_ID"),
      appsToRemove: todo("TODO_TALLY_CE_APPS_TO_REMOVE_FIELD_ID"),
      programsToRemove: todo("TODO_TALLY_CE_PROGRAMS_TO_REMOVE_FIELD_ID"),
      delivery: todo("TODO_TALLY_CE_DELIVERY_FIELD_ID"),
      printName: todo("TODO_TALLY_CE_PRINT_NAME_FIELD_ID"),
      signature: todo("TODO_TALLY_CE_SIGNATURE_FIELD_ID")
    },
    fieldLabels: {
      firstName: ["First Name"], phone: ["Phone Number"], email: ["Email Address"], grade: ["Grade Level"],
      calculatorModel: ["Texas Instrument Model"], version: ["Version Number"],
      python: ["Does your calculator have Python?"], caseIncluded: ["Does your calculator come with its case?"],
      chargerIncluded: ["Did your calculator come with its charger?"],
      dateTimeCurrent: ["Is your calculator's Date & Time up to date?", "Is your calculator’s Date & Time up to date?"],
      cleanCase: ["Would you like us to clean your calculator’s case?", "Would you like us to clean your calculator's case?"],
      background: ["Would you like to have a custom background for your calculator?"],
      gameLauncherMethod: ["How would you like to open the game launcher?"],
      existingLauncherName: ["What is the app/program name of your game launcher?"],
      launcherScreenshot: ["Can you send me a screenshot/picture of the game launcher you currently have?"],
      appsToRemove: ["Are there apps that you would like to remove from your calculator?"],
      programsToRemove: ["Are there programs that you would like to remove from your calculator?"],
      delivery: ["How would you like us to return your calculator?"], printName: ["Print Name"],
      signature: ["Signature Verification", "Signature"]
    },
    groups: {
      games: [
        { fieldId: todo("TODO_TALLY_CE_GAME_SNAKE_FIELD_ID"), label: "Snake" },
        { fieldId: todo("TODO_TALLY_CE_GAME_TETRIS_FIELD_ID"), label: "Tetris" }
      ],
      programs: [
        { fieldId: todo("TODO_TALLY_CE_PROGRAM_QUADRATIC_FIELD_ID"), label: "Quadratic Formula" },
        { fieldId: todo("TODO_TALLY_CE_PROGRAM_UNIT_CIRCLE_FIELD_ID"), label: "Unit Circle" }
      ],
      gameMultiSelectFields: [todo("TODO_TALLY_CE_GAMES_MULTISELECT_FIELD_ID")],
      programMultiSelectFields: [todo("TODO_TALLY_CE_PROGRAMS_MULTISELECT_FIELD_ID")],
      gameMatrixLabels: ["Games for TI-84 Plus CE & PYTHON", "Python Games for TI-84 Plus CE Python ONLY"],
      programMatrixLabels: ["ALGEBRA", "GEOMETRY / TRIONOMETRY", "FINANCE / APPLIED MATH", "CHEMISTRY / SCIENCE", "MATH / ALGORITHMS", "PROGRAMMING / LEARNING", "OTHER"]
    },
    detailColumns: {
      "Ticket ID": "ticketId", "Submitted": "submittedAt", "First Name": "person.firstName",
      "Phone": "person.phone", "Email": "person.email", "Grade": "person.grade",
      "Calculator Model": "calculator.model", "Version": "calculator.version",
      "Python Status": "calculator.python", "Case Included": "calculator.caseIncluded",
      "Charger Included": "calculator.chargerIncluded", "Date Time Current": "options.dateTimeCurrent",
      "Clean Case": "options.cleanCase", "Background": "options.background",
      "Game Launcher Method": "options.gameLauncherMethod", "Existing Launcher Name": "options.existingLauncherName",
      "Launcher Screenshot URL": "options.launcherScreenshotUrl", "Apps To Remove": "options.appsToRemove",
      "Programs To Remove": "options.programsToRemove", "Games Requested": "games",
      "Programs Requested": "programs", "Delivery": "delivery.option", "Print Name": "options.printName",
      "Signature Received": "options.signatureReceived", "Signature URL": "options.signatureUrl",
      "Status": "$status", "Tally Submission ID": "tallySubmissionId"
    }
  },
  {
    formId: process.env.TALLY_PLUS_FORM_ID || "GOOGLE_SHEET_TI84_PLUS",
    formName: "TI-84 Plus Ticket",
    formType: "plus",
    calculatorType: "TI-84 Plus",
    ticketType: "Game Ticket",
    ticketPrefix: "PLUS",
    numbersSheet: "TI-84 Plus",
    numbersTable: "Tickets",
    active: true,
    capabilities: { games: true, programs: true, python: false, gameLauncher: false },
    fields: {},
    groups: { games: [], programs: [], gameMatrixLabels: ["Games for TI-84 Plus & TI-83 Plus"], programMatrixLabels: ["ALGEBRA / MATHEMATICS", "SCIENCE", "OTHER"] },
    detailColumns: {
      "Ticket ID": "ticketId", "Submitted": "submittedAt", "First Name": "person.firstName",
      "Phone": "person.phone", "Email": "person.email", "Grade": "person.grade",
      "Calculator Model": "calculator.model", "Version": "calculator.version",
      "Games Requested": "games", "Programs Requested": "programs", "Delivery": "delivery.option",
      "Status": "$status", "Tally Submission ID": "tallySubmissionId"
    }
  }
];

export function findFormConfig(formId: string, formName?: string): FormConfig | undefined {
  return formConfigs.find((form) => form.active && form.formId === formId)
    ?? formConfigs.find((form) => form.active && Boolean(formName) && form.formName === formName);
}
