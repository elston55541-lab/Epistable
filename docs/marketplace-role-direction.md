# Marketplace role direction

The primary product has three views: Epistable Admin, Seller Organisation and Buyer Organisation. There is no separate Factory Owner marketplace view. Processors, manufacturers, exporters and trading companies participate as seller organisations; ownership is not a platform privilege.

Epistable Admin uses the existing platform_admin authority. Seller and buyer organisations retain their existing admin/member permissions. Existing account display names and legacy roles are not authority and do not grant marketplace access. The historical Epistable Owner label is displayed as Epistable Admin inside the platform portal without changing the account record.

The root route opens the marketplace and resolves the assigned view after sign-in. Accounts without marketplace access receive an assignment explanation and a clearly labelled legacy factory workspace link. Existing factory accounts must be deliberately assigned to an organisation before using a marketplace portal; this change does not migrate or promote them automatically.

The legacy factory workspace remains at /legacy for existing users, labelled separately with a return link to the marketplace. Public /slab/ and /quote/ routes and /invite acceptance remain functional. Legacy operations, authentication, RLS and persisted data are unchanged. Retirement requires a separate explicit decision.
