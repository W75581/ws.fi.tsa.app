sap.ui.define([
    "sap/ui/core/format/DateFormat"
], function (DateFormat) {
    "use strict";

    var sNoTimePattern = "yyyy-MM-dd'T00:00:00'";

    return {
        MAIN_ENTITY_SET: "TSAPosting",
        MAIN_ENTITY_TYPE: "TSAPostingType",
        EXPORT_FILE_NAME: "TSA and Intercompany Invoicing Items.xlsx",
        BASE_YEAR: new Date().getUTCFullYear() + "",
        VAR_DATE_FORMAT: DateFormat.getDateInstance({pattern : "yyyy-MM-dd'T'hh:mm:ss.SSS'Z'", UTC: true }),
        BASE_DATE_FORMAT: DateFormat.getDateInstance({pattern : sNoTimePattern, UTC: true }),
        NON_UTC_FORMAT: DateFormat.getDateInstance({pattern : sNoTimePattern }),
        FORM_OBJECT: {
            Message: "",
            FIDocumentNumber: [],
            PostedDocumentNumberSCC: [],
            Report: false,
            PrintOut: false,
            Simulate: false,
            Rows: [],
            DocumentDate: null,
            PostingDate: null,
            FiltersSnappedText: "",
            SearchEnabled: true,
            ExportEnabled: false,
            Posting: false,
            ItemsSelected: false,
            ShowFooter: false,
            Busy: false
        }
    };
});