# Epistable — Processed Foods Cross-Border Trade Architecture

## Product position

Epistable is the verified trade infrastructure connecting processed-food manufacturers with international buyers across emerging markets.

BRICS is the initial trade corridor, not the permanent boundary of the platform.

## Core marketplace

### Buyer organisations
Buyer Admin, Procurement Manager, and Team Member accounts operate under a buyer organisation.

Core capabilities:
- Discover processed-food manufacturers and products
- Search/filter by category, origin, certifications, MOQ, capacity and export market
- View verified supplier, product and compliance evidence
- Compare suppliers
- Submit RFQs
- Receive and compare quotes
- Progress accepted quotes toward orders
- Track transactions and supplier relationships

### Seller organisations
Seller Admin, Sales/Export Manager, Compliance/QA Manager, and Team Member accounts operate under a seller organisation.

Core capabilities:
- Company/factory profile
- Product/SKU catalogue
- MOQ, capacity, lead time, packaging, shelf life and markets served
- Certifications, test reports and compliance documentation
- Export-readiness evidence
- Receive/manage RFQs
- Issue quotes
- Track buyer opportunities and orders

### Epistable platform
Platform Owner, Admin, Verification/Compliance and Support roles govern the marketplace.

Core capabilities:
- Approve and verify seller organisations
- Review certifications and compliance evidence
- Manage buyers, sellers, categories and products
- Marketplace governance and disputes
- Monitor RFQs, quotes and transactions
- Trust/readiness scoring
- Marketplace analytics
- Suspend/remove access

## Core transaction flow

Seller organisation -> company/factory profile -> product catalogue -> compliance evidence -> Epistable verification -> buyer discovery -> RFQ -> seller quote -> comparison/negotiation -> accepted quote -> order/transaction -> fulfilment -> trust history.

## Processed-food data model

Product categories should support spices and seasonings, snacks, sauces and condiments, ready-to-eat/ready-to-cook, beverages, bakery/confectionery, frozen/processed produce, ingredients and other packaged processed foods.

Product records should be able to capture:
- Product name and category
- Ingredients/specification
- Country of origin
- MOQ
- Production capacity
- Unit/packaging formats
- Shelf life and storage requirements
- Lead time
- Target/export markets
- Certifications
- Test reports / COA where applicable
- Allergen and dietary attributes where applicable
- Buyer-specific/private documents

## Trust layer

Epistable should differentiate itself from a directory by making trust and transaction readiness first-class platform objects:
- Organisation verification
- Factory verification
- Certification/document verification
- Product evidence completeness
- Export-readiness indicators
- Verification status and expiry dates
- Transaction/reliability history

Do not present an algorithmic trust score as a regulatory certification. Clearly distinguish Epistable verification from official regulatory or certification-body approval.

## Geographic strategy

Phase 1: Indian processed-food sellers -> buyers across BRICS and other relevant international markets.

Phase 2: Sellers and buyers across BRICS markets.

Phase 3: Broader emerging-market cross-border processed-food trade.

Architecture must therefore store country/currency/market attributes generically and must not hard-code the platform to India or a fixed BRICS membership list.

## Finance layer — later phase

Build the marketplace and trade data first. Once transaction data exists, add optional financial infrastructure such as payment protection, trade credit, invoice financing, purchase-order financing, insurance and logistics integrations through appropriately regulated partners. Epistable should not represent itself as a lender unless it becomes appropriately authorised.

### Finance-readiness data captured now

The transaction layer should already build the evidence base that regulated finance partners may later use. Accepted orders therefore preserve:

- Agreed order value, currency, quantity and Incoterm
- Purchase-order reference, issue date, value and payment terms when supplied
- Invoice reference, amount, issue/due dates and invoice status when supplied
- Payment status, amount paid and payment timestamp when verified
- Operational milestone timestamps from confirmation through production, inspection, dispatch, delivery and completion
- An append-only order-event history for transaction provenance and future underwriting/audit integrations

These fields are infrastructure, not a lending decision or credit score. Finance eligibility and underwriting remain the responsibility of appropriately regulated finance partners.

## Product principle

Epistable is not another B2B listing portal. The product should progressively connect four layers:

Discovery -> Verification -> Transaction -> Finance

Every major product decision should reinforce this progression.