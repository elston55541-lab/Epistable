# Marketplace roles and routing

The marketplace has Platform Admin, Seller Admin / Seller Member, and Buyer Admin / Buyer Member. There is no separate Factory Owner marketplace role.

The root route resolves the portal from marketplace_context(). That context reads epistable_private.marketplace_access, joined to an active profile and a matching organisation type. Legacy owner/admin roles, profile organisation fields and JWT metadata are not marketplace authority.

Self-serve Buyer/Seller registration is at /join. Registration creates a pending organisation/application; it does not grant marketplace access. Platform review must grant only the application's intended Buyer/Seller role. See the security audit for the deployed approval defect and proposed repair.

The existing explicit organisation-assignment workflow is platform-admin controlled. One organisation membership per Auth user is supported today.

Keep /legacy, /slab/*, /quote/* and /invite. Legacy factory access remains separate. Preserve current Buyer mobile navigation, Trade GPT layout and Seller/Admin visual structure.
