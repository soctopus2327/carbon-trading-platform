const COMPANY_TYPE = {

    INDIVIDUAL: "INDIVIDUAL",
    COMPANY: "COMPANY",
    ALLIANCE: "ALLIANCE"

};

const COMPANY_STATUS = {

    PENDING: "PENDING",
    ACTIVE: "ACTIVE",
    REJECTED: "REJECTED",
    BLOCKED: "BLOCKED",
    MERGED: "MERGED"

};

const USER_ROLE = {

    PLATFORM_ADMIN: "PLATFORM_ADMIN", // NEW: super admin across the whole platform
    ADMIN: "ADMIN",                   // company-level admin
    TRADER: "TRADER",
    AUDITOR: "AUDITOR",
    VIEWER: "VIEWER"

};

const LISTING_STATUS = {

    ACTIVE: "ACTIVE",
    CLOSED: "CLOSED",
    CANCELLED: "CANCELLED"

};

const PAYMENT_STATUS = {

    PENDING: "PENDING",
    SUCCESS: "SUCCESS",
    FAILED: "FAILED"

};

module.exports = {

    COMPANY_TYPE,
    COMPANY_STATUS,
    USER_ROLE,
    LISTING_STATUS,
    PAYMENT_STATUS

};