// ===== TYPES =====

export type CustomerStatus = "active" | "inactive" | "new" | "vip";
export type PaymentStatus = "paid" | "pending" | "overdue";
export type EmployeeStatus = "active" | "on_job" | "break" | "offline";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface Customer {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email?: string;
  monthlyPrice: number;
  frequency: string;
  status: CustomerStatus;
  joinDate: string;
  lastVisit: string;
  nextVisit: string;
  notes: string;
  tags: string[];
  totalPaid: number;
  balance: number;
  lat: number;
  lng: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string;
  status: EmployeeStatus;
  currentJob?: string;
  hourlyRate: number;
  hoursThisMonth: number;
  lat: number;
  lng: number;
  performance: number;
  joinDate: string;
  avatar: string;
}

export interface Job {
  id: string;
  customerId: string;
  customerName: string;
  address: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  status: TaskStatus;
  assignedTo: string[];
  price: number;
  notes?: string;
  priority: Priority;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  lastUsed: string;
  pricePerUnit: number;
  supplier: string;
}

export interface Transaction {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  status: PaymentStatus;
  method: "cash" | "credit" | "bit" | "transfer";
}

export interface Project {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  status: "planning" | "active" | "completed" | "on_hold";
  progress: number;
  description: string;
  tasks: string[];
}

// ===== MOCK DATA =====

export const customers: Customer[] = [
  {
    id: "c1",
    name: "משפחת כהן",
    city: "רעננה",
    address: "רחוב הורד 12, רעננה",
    phone: "054-1234567",
    email: "cohen@example.com",
    monthlyPrice: 450,
    frequency: "פעמיים בחודש",
    status: "vip",
    joinDate: "2022-03-15",
    lastVisit: "2026-04-15",
    nextVisit: "2026-04-29",
    notes: "להיזהר מהכלב בכניסה. לא לכסח ביום שישי.",
    tags: ["VIP", "גינה גדולה", "השקיה אוטומטית"],
    totalPaid: 8100,
    balance: 0,
    lat: 32.185,
    lng: 34.871,
  },
  {
    id: "c2",
    name: "דוד לוי",
    city: "הרצליה",
    address: "שד' בן גוריון 34, הרצליה",
    phone: "052-9876543",
    monthlyPrice: 300,
    frequency: "פעם בחודש",
    status: "active",
    joinDate: "2023-01-10",
    lastVisit: "2026-04-10",
    nextVisit: "2026-05-10",
    notes: "מעדיף עבודה בשעות הבוקר לפני 10:00",
    tags: ["גינה קטנה", "עצי פרי"],
    totalPaid: 3900,
    balance: 300,
    lat: 32.165,
    lng: 34.845,
  },
  {
    id: "c3",
    name: "שרה אברהם",
    city: "כפר סבא",
    address: "רחוב הגפן 8, כפר סבא",
    phone: "050-5551234",
    email: "sarah@example.com",
    monthlyPrice: 600,
    frequency: "שבועי",
    status: "active",
    joinDate: "2021-06-20",
    lastVisit: "2026-04-22",
    nextVisit: "2026-04-29",
    notes: "ערוגת ורדים מיוחדת — לא לגעת ללא אישור",
    tags: ["גינה גדולה", "ורדים", "תאורה"],
    totalPaid: 18600,
    balance: 0,
    lat: 32.175,
    lng: 34.906,
  },
  {
    id: "c4",
    name: "רון מזרחי",
    city: "פתח תקווה",
    address: "רחוב ז'בוטינסקי 55, פתח תקווה",
    phone: "053-7778889",
    monthlyPrice: 250,
    frequency: "פעם בחודשיים",
    status: "inactive",
    joinDate: "2023-08-01",
    lastVisit: "2026-02-20",
    nextVisit: "2026-04-20",
    notes: "לא ענה לטלפון בחודש האחרון",
    tags: ["חנות", "מרפסת"],
    totalPaid: 1000,
    balance: 250,
    lat: 32.089,
    lng: 34.889,
  },
  {
    id: "c5",
    name: "מלון פלאזה",
    city: "נתניה",
    address: "רחוב הרצל 1, נתניה",
    phone: "09-8765432",
    email: "plaza@hotel.com",
    monthlyPrice: 3500,
    frequency: "שבועי x2",
    status: "vip",
    joinDate: "2020-05-15",
    lastVisit: "2026-04-24",
    nextVisit: "2026-04-27",
    notes: "לקוח עסקי, חשבוניות חודשיות, תיאום מראש חובה",
    tags: ["עסקי", "VIP", "גינה גדולה מאוד"],
    totalPaid: 147000,
    balance: 0,
    lat: 32.332,
    lng: 34.856,
  },
  {
    id: "c6",
    name: "נועה שפירא",
    city: "רמת גן",
    address: "שד' ירושלים 22, רמת גן",
    phone: "054-3334445",
    monthlyPrice: 350,
    frequency: "פעמיים בחודש",
    status: "new",
    joinDate: "2026-03-01",
    lastVisit: "2026-04-05",
    nextVisit: "2026-04-30",
    notes: "לקוחה חדשה, הופנתה ע\"י משפחת כהן",
    tags: ["חדש", "גינת גג"],
    totalPaid: 700,
    balance: 0,
    lat: 32.082,
    lng: 34.819,
  },
];

export const employees: Employee[] = [
  {
    id: "e1",
    name: "יוסי ביטון",
    role: "גנן ראשי",
    phone: "054-1112223",
    status: "on_job",
    currentJob: "משפחת כהן, רעננה",
    hourlyRate: 65,
    hoursThisMonth: 142,
    lat: 32.185,
    lng: 34.871,
    performance: 96,
    joinDate: "2019-04-01",
    avatar: "יב",
  },
  {
    id: "e2",
    name: "אמיר חסן",
    role: "גנן",
    phone: "052-4445556",
    status: "on_job",
    currentJob: "מלון פלאזה, נתניה",
    hourlyRate: 55,
    hoursThisMonth: 128,
    lat: 32.332,
    lng: 34.856,
    performance: 88,
    joinDate: "2021-02-15",
    avatar: "אח",
  },
  {
    id: "e3",
    name: "מיכל גרין",
    role: "מומחית צמחים",
    phone: "050-7778889",
    status: "active",
    hourlyRate: 70,
    hoursThisMonth: 96,
    lat: 32.082,
    lng: 34.819,
    performance: 99,
    joinDate: "2022-09-01",
    avatar: "מג",
  },
  {
    id: "e4",
    name: "דני אלון",
    role: "גנן",
    phone: "053-0001112",
    status: "break",
    hourlyRate: 50,
    hoursThisMonth: 110,
    lat: 32.175,
    lng: 34.906,
    performance: 82,
    joinDate: "2023-03-10",
    avatar: "דא",
  },
  {
    id: "e5",
    name: "רחל מוסה",
    role: "עוזרת גנן",
    phone: "054-2223334",
    status: "offline",
    hourlyRate: 45,
    hoursThisMonth: 88,
    lat: 32.089,
    lng: 34.889,
    performance: 85,
    joinDate: "2024-01-20",
    avatar: "רמ",
  },
];

export const jobs: Job[] = [
  {
    id: "j1",
    customerId: "c1",
    customerName: "משפחת כהן",
    address: "רחוב הורד 12, רעננה",
    date: "2026-04-29",
    time: "09:00",
    duration: 3,
    type: "תחזוקה שוטפת",
    status: "pending",
    assignedTo: ["e1"],
    price: 225,
    priority: "medium",
  },
  {
    id: "j2",
    customerId: "c5",
    customerName: "מלון פלאזה",
    address: "רחוב הרצל 1, נתניה",
    date: "2026-04-27",
    time: "07:00",
    duration: 6,
    type: "כיסוח + גיזום",
    status: "in_progress",
    assignedTo: ["e2"],
    price: 1750,
    priority: "high",
  },
  {
    id: "j3",
    customerId: "c3",
    customerName: "שרה אברהם",
    address: "רחוב הגפן 8, כפר סבא",
    date: "2026-04-29",
    time: "10:00",
    duration: 2,
    type: "השקיה + ניקיון",
    status: "pending",
    assignedTo: ["e3"],
    price: 300,
    priority: "medium",
  },
  {
    id: "j4",
    customerId: "c6",
    customerName: "נועה שפירא",
    address: "שד' ירושלים 22, רמת גן",
    date: "2026-04-30",
    time: "11:00",
    duration: 4,
    type: "שתילה + עיצוב",
    status: "pending",
    assignedTo: ["e1", "e4"],
    price: 700,
    priority: "high",
  },
  {
    id: "j5",
    customerId: "c2",
    customerName: "דוד לוי",
    address: "שד' בן גוריון 34, הרצליה",
    date: "2026-04-25",
    time: "08:00",
    duration: 2.5,
    type: "כיסוח",
    status: "completed",
    assignedTo: ["e4"],
    price: 300,
    priority: "low",
  },
];

export const inventoryItems: InventoryItem[] = [
  { id: "i1", name: "דשן NPK 20-20-20", category: "דשנים", quantity: 12, unit: "ק\"ג", minStock: 5, lastUsed: "2026-04-22", pricePerUnit: 28, supplier: "אגרו-טק" },
  { id: "i2", name: "קוטל עשבים Roundup", category: "ריסוסים", quantity: 3, unit: "ליטר", minStock: 4, lastUsed: "2026-04-20", pricePerUnit: 85, supplier: "כימיקל ישראל" },
  { id: "i3", name: "שתילי ורדים", category: "שתילים", quantity: 24, unit: "יח'", minStock: 10, lastUsed: "2026-04-18", pricePerUnit: 35, supplier: "משתלת השרון" },
  { id: "i4", name: "דשא סינטטי (גליל)", category: "חומרים", quantity: 2, unit: "גליל", minStock: 1, lastUsed: "2026-04-10", pricePerUnit: 1200, supplier: "גרין-לייף" },
  { id: "i5", name: "טפטפות Q2", category: "השקיה", quantity: 85, unit: "יח'", minStock: 50, lastUsed: "2026-04-15", pricePerUnit: 4.5, supplier: "נטפים" },
  { id: "i6", name: "שמן מנוע מכסחת", category: "ציוד", quantity: 2, unit: "ליטר", minStock: 3, lastUsed: "2026-04-01", pricePerUnit: 45, supplier: "סנפרוסט" },
  { id: "i7", name: "מיכל תרסיס גב", category: "ציוד", quantity: 1, unit: "יח'", minStock: 1, lastUsed: "2026-04-20", pricePerUnit: 380, supplier: "גינה+" },
  { id: "i8", name: "אדמה מועשרת", category: "חומרים", quantity: 8, unit: "שקים", minStock: 5, lastUsed: "2026-04-17", pricePerUnit: 55, supplier: "קרקע-ישראל" },
];

export const transactions: Transaction[] = [
  { id: "t1", date: "2026-04-24", customerId: "c5", customerName: "מלון פלאזה", type: "income", amount: 3500, description: "אחזקה חודשית אפריל", status: "paid", method: "transfer" },
  { id: "t2", date: "2026-04-22", customerId: "c1", customerName: "משפחת כהן", type: "income", amount: 225, description: "כיסוח + גיזום", status: "paid", method: "bit" },
  { id: "t3", date: "2026-04-20", customerId: "c3", customerName: "שרה אברהם", type: "income", amount: 300, description: "תחזוקה שבועית", status: "paid", method: "cash" },
  { id: "t4", date: "2026-04-18", customerId: "c2", customerName: "דוד לוי", type: "income", amount: 300, description: "כיסוח חודשי", status: "pending", method: "bit" },
  { id: "t5", date: "2026-04-15", customerId: "c6", customerName: "נועה שפירא", type: "income", amount: 350, description: "שתילה ראשונית", status: "paid", method: "credit" },
  { id: "t6", date: "2026-04-10", customerId: "c4", customerName: "רון מזרחי", type: "income", amount: 250, description: "תחזוקה", status: "overdue", method: "bit" },
  { id: "t7", date: "2026-04-08", customerId: "", customerName: "ספק — אגרו-טק", type: "expense", amount: 840, description: "קניית דשנים וריסוסים", status: "paid", method: "transfer" },
  { id: "t8", date: "2026-04-01", customerId: "", customerName: "ציוד — גינה+", type: "expense", amount: 380, description: "מיכל תרסיס חדש", status: "paid", method: "credit" },
];

export const projects: Project[] = [
  {
    id: "p1",
    name: "עיצוב גינה חדשה — וילה כהן",
    customerId: "c1",
    customerName: "משפחת כהן",
    startDate: "2026-04-01",
    endDate: "2026-05-15",
    budget: 12000,
    spent: 5400,
    status: "active",
    progress: 45,
    description: "עיצוב מחדש של הגינה הקדמית. כולל שתילת 30 שיחים, מסלול אבן, ותאורת גינה.",
    tasks: ["תכנון ואישור", "הכנת קרקע", "שתילה", "התקנת תאורה", "גימור"],
  },
  {
    id: "p2",
    name: "מערכת השקיה אוטומטית — מלון פלאזה",
    customerId: "c5",
    customerName: "מלון פלאזה",
    startDate: "2026-03-15",
    endDate: "2026-04-30",
    budget: 45000,
    spent: 38000,
    status: "active",
    progress: 85,
    description: "התקנת מערכת השקיה חכמה עם בקר IoT לכלל שטחי המלון.",
    tasks: ["סקר שטח", "תכנון", "חפירה", "הנחת צנרת", "בקר + אפליקציה", "בדיקות"],
  },
  {
    id: "p3",
    name: "גינת גג — נועה שפירא",
    customerId: "c6",
    customerName: "נועה שפירא",
    startDate: "2026-04-15",
    endDate: "2026-06-01",
    budget: 8500,
    spent: 1200,
    status: "planning",
    progress: 15,
    description: "עיצוב וביצוע גינת גג מודרנית עם עשבי תיבול, ירקות, ופינת ישיבה.",
    tasks: ["תכנון", "רכישת עציצים", "שתילה", "מסלולים", "ריהוט"],
  },
];

// Monthly revenue data for charts
export const monthlyRevenue = [
  { month: "נוב׳", income: 18200, expense: 3100 },
  { month: "דצמ׳", income: 19800, expense: 4200 },
  { month: "ינו׳", income: 15600, expense: 2800 },
  { month: "פבר׳", income: 17400, expense: 3600 },
  { month: "מרץ", income: 22100, expense: 4100 },
  { month: "אפר׳", income: 24850, expense: 3800 },
];

export const jobTypeDistribution = [
  { name: "תחזוקה שוטפת", value: 45, color: "#22c55e" },
  { name: "כיסוח", value: 22, color: "#4ade80" },
  { name: "שתילה", value: 15, color: "#16a34a" },
  { name: "גיזום", value: 12, color: "#86efac" },
  { name: "השקיה", value: 6, color: "#bbf7d0" },
];

export const weeklyJobs = [
  { day: "ראשון", jobs: 8 },
  { day: "שני", jobs: 12 },
  { day: "שלישי", jobs: 10 },
  { day: "רביעי", jobs: 14 },
  { day: "חמישי", jobs: 11 },
  { day: "שישי", jobs: 6 },
];

// Upsell suggestions
export const upsellAlerts = [
  { id: "u1", customerId: "c2", customerName: "דוד לוי", message: "לא קיבל דשן כבר 3 חודשים", potential: 150, type: "fertilizer" },
  { id: "u2", customerId: "c1", customerName: "משפחת כהן", message: "הגדר חיה דורשת גיזום מקצועי", potential: 400, type: "trimming" },
  { id: "u3", customerId: "c3", customerName: "שרה אברהם", message: "עונת ריסוס — מומלץ להציע טיפול", potential: 250, type: "spraying" },
  { id: "u4", customerId: "c6", customerName: "נועה שפירא", message: "לקוחה חדשה — מומלץ להציע חבילה שנתית", potential: 2000, type: "package" },
];
