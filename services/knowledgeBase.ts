// This file simulates the extracted text content from the files in your Google Drive.
// In a full enterprise solution, a backend would scrape the Drive and generate this dynamically.

export const MUNICIPAL_DOCUMENTS = `
---
DOCUMENT: MUNICIPAL_WASTE_MANAGEMENT_2024.pdf
TYPE: SCHEDULE
CONTENT:
1. RESIDENTIAL COLLECTION SCHEDULE:
   - Zone A (Downtown, North Zane): Mondays and Thursdays.
   - Zone B (South Zane, Industrial District): Tuesdays and Fridays.
   - Zone C (West Hills): Wednesdays only (Bulk pickup available).
   
2. RECYCLING RULES:
   - Blue Bin: Paper, Cardboard, Newspapers.
   - Green Bin: Glass, Hard Plastics (Types 1, 2, 5), Aluminum cans.
   - Prohibited Items: Styrofoam, Plastic Bags, Electronics (take to e-waste center).

3. HAZARDOUS WASTE:
   - Batteries and paint must be dropped off at the Depot on 4th Avenue. Open Sat 9AM-2PM.
---
DOCUMENT: BUSINESS_TAX_RATES_FY2024.xlsx
TYPE: SPREADSHEET
CONTENT:
| Business Type | Tax Rate (%) | Annual Fixed Fee |
|---------------|--------------|------------------|
| Retail        | 4.5%         | $1,200           |
| Hospitality   | 5.0%         | $2,500           |
| Technology    | 3.0%         | $1,000           |
| Industrial    | 6.2%         | $5,000           |

*Note: Small businesses with revenue under $50,000 are exempt from the Fixed Fee.*
---
DOCUMENT: BUILDING_PERMIT_REQ_V2.docx
TYPE: FORM_GUIDE
CONTENT:
To apply for a home renovation permit (Form BP-202), you must submit:
1. Completed application form.
2. Two (2) sets of architectural drawings.
3. Proof of property ownership (Deed or Tax Bill).
4. A processing fee of $150.00 (Non-refundable).

Processing Time: Standard processing takes 10-14 business days. Expedited (3 days) costs an extra $500.
---
DOCUMENT: MAYOR_DECREE_PARKS.pdf
TYPE: ANNOUNCEMENT
CONTENT:
Effective June 1st, 2024:
- Central Park will close at 10:00 PM (previously 11:00 PM).
- BBQ fires are strictly prohibited in all municipal parks due to dry season risks.
- The new "Dog Park" in West Hills is officially open. Leashes are optional inside the fenced area.
---
`;