import type { Tutorial } from "./types"

export const TUTORIALS: Tutorial[] = [
  // ==================== OWNER DASHBOARD ====================
  {
    id: "owner-dashboard",
    title: "Business Command Center Guide",
    description: "Learn how to monitor your entire company's performance",
    roles: ["OWNER"],
    pages: ["/dashboard/owner"],
    steps: [
      {
        target: "[data-tour='owner-title']",
        title: "Business Command Center",
        content: "This is your main dashboard. Monitor the entire company's performance — revenue, costs, production, and risks — all in one place.",
        placement: "bottom",
      },
      {
        target: "[data-tour='owner-kpis']",
        title: "Business Overview",
        content: "These KPI cards show your Total Revenue, Total Costs, Net Profit, and Cash Burn Rate. Track these daily to understand financial health at a glance.",
        placement: "bottom",
      },
      {
        target: "[data-tour='owner-anomalies']",
        title: "Money Leak Detection",
        content: "This section automatically detects anomalies — cost overruns, inventory shortages, emergency purchases, and other issues where money is leaking. Review these alerts daily and click them to investigate.",
        placement: "bottom",
      },
      {
        target: "[data-tour='owner-insights']",
        title: "Smart Business Insights",
        content: "AI-powered insights highlight problems like loss-making work orders, production bottlenecks, and planning failures. Each card gives you a specific action item.",
        placement: "top",
      },
      {
        target: "[data-tour='owner-cashflow']",
        title: "Cash Flow & Financial Health",
        content: "The 12-Month Cash Flow chart shows income vs expenses over time. The Financial Health panel shows your burn rate, receivables, and how many months you can operate with current cash.",
        placement: "top",
      },
      {
        target: "[data-tour='owner-risks']",
        title: "Risk Management",
        content: "Financial Risks shows loss-making work orders. Production Risks shows bottlenecks and delays. Review these sections to identify problems early.",
        placement: "top",
      },
      {
        target: "[data-tour='owner-suppliers']",
        title: "Supplier & Employee Analysis",
        content: "Track spending by supplier and see which employees are most active. Use this data to negotiate better rates and recognize top performers.",
        placement: "top",
      },
      {
        target: "[data-tour='owner-tabs']",
        title: "Overview & Analytics Tabs",
        content: "Switch between Overview for daily monitoring and Analytics for deep dives into work order status, profit analysis, and material costs.",
        placement: "bottom",
      },
    ],
  },

  // ==================== MANAGER DASHBOARD ====================
  {
    id: "manager-dashboard",
    title: "Manager Dashboard Guide",
    description: "Learn how to manage work orders and production pipeline",
    roles: ["MANAGER"],
    pages: ["/dashboard/manager"],
    steps: [
      {
        target: "[data-tour='manager-title']",
        title: "Manager Dashboard",
        content: "This is your command center for managing work orders from creation to delivery. Track the entire pipeline here.",
        placement: "bottom",
      },
      {
        target: "[data-tour='manager-kpis']",
        title: "Work Order Summary",
        content: "Quickly see Total Orders, Active projects, Pending Approvals, Delayed items, and Completed work. These numbers help you prioritize your day.",
        placement: "bottom",
      },
      {
        target: "[data-tour='manager-new-wo']",
        title: "Create New Work Orders",
        content: "Click here to create new customer projects. Fill in customer details, furniture specifications, and budget to get started.",
        placement: "left",
      },
      {
        target: "[data-tour='manager-pipeline']",
        title: "Work Order Pipeline",
        content: "This bar chart shows your current pipeline — how many orders are active, in production, delayed, or completed. Use it to spot bottlenecks.",
        placement: "top",
      },
      {
        target: "[data-tour='manager-approvals']",
        title: "Pending Design Approvals",
        content: "Review designs submitted by your designers here. You can approve them or request revisions before production begins.",
        placement: "left",
      },
      {
        target: "[data-tour='manager-materials']",
        title: "Materials Pending Review",
        content: "When work orders need materials, they appear here. Review and approve material requests to keep production moving.",
        placement: "top",
      },
      {
        target: "[data-tour='manager-table']",
        title: "Recent Work Orders",
        content: "This table lists all recent work orders. Click 'View' to see details, track progress, assign workers, and manage each project.",
        placement: "top",
      },
    ],
  },

  // ==================== DESIGNER DASHBOARD ====================
  {
    id: "designer-dashboard",
    title: "Designer Dashboard Guide",
    description: "Learn how to manage your design tasks",
    roles: ["DESIGNER"],
    pages: ["/dashboard/designer"],
    steps: [
      {
        target: "[data-tour='designer-title']",
        title: "Designer Dashboard",
        content: "This is your workspace. View all designs assigned to you, track your progress, and submit completed work for approval.",
        placement: "bottom",
      },
      {
        target: "[data-tour='designer-kpis']",
        title: "Your Design Stats",
        content: "See how many designs are assigned to you, how many you're working on, pending reviews, and approved designs at a glance.",
        placement: "bottom",
      },
      {
        target: "[data-tour='designer-assignments']",
        title: "Assigned Work Orders",
        content: "These are your pending design tasks. Each card shows the work order ID, customer name, and status. Click any card to open the work order and upload your designs.",
        placement: "top",
      },
      {
        target: "[data-tour='designer-reviews']",
        title: "Design Reviews",
        content: "When the manager reviews your submitted designs, their feedback appears here. If revisions are requested, you'll see them in this section.",
        placement: "left",
      },
    ],
  },

  // ==================== INVENTORY MANAGER DASHBOARD ====================
  {
    id: "inventory-dashboard",
    title: "Inventory Manager Guide",
    description: "Learn how to manage inventory and materials",
    roles: ["INVENTORY_MANAGER"],
    pages: ["/dashboard/inventory-manager"],
    steps: [
      {
        target: "[data-tour='inventory-title']",
        title: "Inventory Manager Dashboard",
        content: "This is your inventory command center. Monitor stock levels, manage material requests, and keep production running smoothly.",
        placement: "bottom",
      },
      {
        target: "[data-tour='inventory-kpis']",
        title: "Inventory Overview",
        content: "Monitor Total Items in stock, total Stock Value, Low Stock Alerts that need attention, and items Ready for Production.",
        placement: "bottom",
      },
      {
        target: "[data-tour='inventory-add-materials']",
        title: "Add Materials to Work Order",
        content: "Use this form to assign materials from inventory directly to work orders. Select the work order, choose materials, and update quantities.",
        placement: "top",
      },
      {
        target: "[data-tour='inventory-low-stock']",
        title: "Low Stock Alerts",
        content: "Items running low on stock appear here. Reorder them before they run out to avoid production delays.",
        placement: "left",
      },
      {
        target: "[data-tour='inventory-ready']",
        title: "Production Ready Orders",
        content: "Work orders that have all required materials available are listed here. These are ready to move into production.",
        placement: "right",
      },
      {
        target: "[data-tour='inventory-all']",
        title: "All Inventory Items",
        content: "Complete inventory list showing every item, its current stock, category, and unit. Click items to edit or view details.",
        placement: "top",
      },
    ],
  },

  // ==================== ACCOUNTANT DASHBOARD ====================
  {
    id: "accountant-dashboard",
    title: "Accountant Dashboard Guide",
    description: "Learn how to track finances and payments",
    roles: ["ACCOUNTANT"],
    pages: ["/dashboard/accountant"],
    steps: [
      {
        target: "[data-tour='accountant-title']",
        title: "Accountant Dashboard",
        content: "This is your financial control center. Track payments, expenses, and overall profitability from here.",
        placement: "bottom",
      },
      {
        target: "[data-tour='accountant-filters']",
        title: "Filter Controls",
        content: "Filter financial data by date range, category, payment status, or search for specific transactions to find what you need quickly.",
        placement: "bottom",
      },
      {
        target: "[data-tour='accountant-kpis']",
        title: "Financial Overview",
        content: "Track Money In (revenue), Money Out (expenses), Pending Payments, Installments due, and Total Receivables. These are your key financial metrics.",
        placement: "bottom",
      },
      {
        target: "[data-tour='accountant-material-review']",
        title: "Material Purchase Approvals",
        content: "Review and approve material purchase requests. Verify costs against budgets before approving procurement.",
        placement: "top",
      },
      {
        target: "[data-tour='accountant-charts']",
        title: "Revenue vs Expenses",
        content: "This chart compares income against expenses over time. Use the pie chart to see expense breakdown by category.",
        placement: "top",
      },
      {
        target: "[data-tour='accountant-profit']",
        title: "Profit Analysis",
        content: "See profitability by work order. Green means profitable, red means loss-making. Investigate losses to control costs.",
        placement: "left",
      },
    ],
  },

  // ==================== PRODUCTION MANAGER DASHBOARD ====================
  {
    id: "production-dashboard",
    title: "Production Manager Guide",
    description: "Learn how to manage production and workers",
    roles: ["PRODUCTION_MANAGER"],
    pages: ["/dashboard/production"],
    steps: [
      {
        target: "[data-tour='production-title']",
        title: "Production Dashboard",
        content: "This is your production control center. Monitor all active production, assign workers, and track progress in real-time.",
        placement: "bottom",
      },
      {
        target: "[data-tour='production-kpis']",
        title: "Production Overview",
        content: "See how many items are In Production, In Queue, Delayed, and upcoming deliveries. The dashboard auto-refreshes every 30 seconds.",
        placement: "bottom",
      },
      {
        target: "[data-tour='production-active']",
        title: "Active Production",
        content: "Items currently being produced are shown here. Each card shows progress, which production stage it's at, and which workers are assigned.",
        placement: "top",
      },
      {
        target: "[data-tour='production-queue']",
        title: "Production Queue",
        content: "Items waiting to enter production are listed here. Click 'Start' to begin production on the next item.",
        placement: "left",
      },
      {
        target: "[data-tour='production-delays']",
        title: "Delayed Orders",
        content: "Any production items that are behind schedule appear here. Investigate and resolve delays to keep production on track.",
        placement: "right",
      },
      {
        target: "[data-tour='production-completed']",
        title: "Recently Completed",
        content: "Items that finished production recently are shown here for quick reference.",
        placement: "top",
      },
    ],
  },

  // ==================== FACTORY OPS DASHBOARD ====================
  {
    id: "factory-dashboard",
    title: "Factory Operations Guide",
    description: "Learn how to monitor factory floor operations",
    roles: ["OWNER", "MANAGER", "PRODUCTION_MANAGER"],
    pages: ["/dashboard/factory"],
    steps: [
      {
        target: "[data-tour='factory-title']",
        title: "Factory Operations",
        content: "This is a real-time view of your factory floor. Monitor active production, worker utilization, and identify bottlenecks immediately.",
        placement: "bottom",
      },
      {
        target: "[data-tour='factory-kpis']",
        title: "Factory KPIs",
        content: "Key metrics: Active production items, items in queue, delayed orders, and number of active workers on the floor.",
        placement: "bottom",
      },
      {
        target: "[data-tour='factory-active']",
        title: "Active Production Board",
        content: "Kanban-style cards showing each item in production. Track progress, stages completed, assigned workers, and any delays at a glance.",
        placement: "top",
      },
      {
        target: "[data-tour='factory-queue']",
        title: "Production Queue",
        content: "Items waiting to enter the production line. Prioritize and start items based on deadlines and customer priority.",
        placement: "left",
      },
      {
        target: "[data-tour='factory-sidebar']",
        title: "Production Insights",
        content: "The sidebar shows delayed orders, material shortages, bottleneck detection, and worker utilization. Use this to identify and solve problems.",
        placement: "left",
      },
    ],
  },

  // ==================== WORK ORDERS PAGE ====================
  {
    id: "work-orders-page",
    title: "Work Order Management Guide",
    description: "Learn how to manage all work orders",
    roles: ["OWNER", "MANAGER", "DESIGNER", "INVENTORY_MANAGER", "ACCOUNTANT", "PRODUCTION_MANAGER"],
    pages: ["/work-orders"],
    steps: [
      {
        target: "[data-tour='wo-title']",
        title: "Work Orders",
        content: "This page lists all work orders in the system. Each work order is a customer project from design through delivery.",
        placement: "bottom",
      },
      {
        target: "[data-tour='wo-new']",
        title: "Create Work Order",
        content: "Click here to create a new work order. Fill in customer info, furniture specifications, budget, and timeline.",
        placement: "left",
      },
      {
        target: "[data-tour='wo-table']",
        title: "Work Orders List",
        content: "Each row is a work order showing ID, customer, status, priority, due date, assigned designer, and actions. Click 'View' to open details.",
        placement: "top",
      },
      {
        target: "[data-tour='wo-filters']",
        title: "Filter & Search",
        content: "Use filters to narrow down work orders by status, priority, or customer. Search for specific work orders by ID or customer name.",
        placement: "bottom",
      },
    ],
  },

  // ==================== INVENTORY PAGE ====================
  {
    id: "inventory-page",
    title: "Inventory Management Guide",
    description: "Learn how to manage inventory items",
    roles: ["OWNER", "MANAGER", "INVENTORY_MANAGER", "PRODUCTION_MANAGER"],
    pages: ["/inventory"],
    steps: [
      {
        target: "[data-tour='inv-title']",
        title: "Inventory Management",
        content: "This page shows all materials and supplies in your inventory. Keep stock levels accurate to avoid production delays.",
        placement: "bottom",
      },
      {
        target: "[data-tour='inv-stats']",
        title: "Inventory Statistics",
        content: "Quick overview of total items, stock value, low stock items, and out of stock materials that need immediate attention.",
        placement: "bottom",
      },
      {
        target: "[data-tour='inv-table']",
        title: "Inventory Items",
        content: "Each item shows name, category, current stock, minimum stock level, and unit. Items below minimum stock are highlighted in red.",
        placement: "top",
      },
      {
        target: "[data-tour='inv-actions']",
        title: "Inventory Actions",
        content: "Add new items, update stock quantities, or adjust inventory records here. Keeping inventory accurate is your responsibility.",
        placement: "left",
      },
    ],
  },

  // ==================== SCHEDULE PAGE ====================
  {
    id: "schedule-page",
    title: "Production Schedule Guide",
    description: "Learn how to manage worker schedules",
    roles: ["OWNER", "MANAGER", "PRODUCTION_MANAGER"],
    pages: ["/schedule"],
    steps: [
      {
        target: "[data-tour='schedule-title']",
        title: "Production Schedule",
        content: "This is your production timeline. Schedule workers, track deadlines, and manage workload across the factory floor.",
        placement: "bottom",
      },
      {
        target: "[data-tour='schedule-calendar']",
        title: "Schedule Calendar",
        content: "View production schedules by day, week, or month. Each block shows which work orders are scheduled and which workers are assigned.",
        placement: "top",
      },
    ],
  },
]

export function getTutorialsForPage(page: string): Tutorial[] {
  return TUTORIALS.filter((t) => t.pages.some((p) => page.startsWith(p)))
}

export function getTutorialForRoleAndPage(role: string, page: string): Tutorial | undefined {
  const pageTutorials = getTutorialsForPage(page)
  return pageTutorials.find((t) => t.roles.includes(role as any))
}

export function getTutorialById(id: string): Tutorial | undefined {
  return TUTORIALS.find((t) => t.id === id)
}
