sap.ui.define([], function () {
    "use strict";
    return {
        "FORM_OBJECT": {
            "CompanyCode": [],
            "Report": false,
            "Busy": false,
            "PrintOut": false,
            "ShowFooter": false,
            "Simulate": false
        },
        "COMPANY_CODE_PROP": "CompanyCode",
        "COMPANY_CODE_TEXT": "CompanyCodeName",
        "FISCAL_YEAR_PROP": "FiscalYear",
        "FISCAL_PERIOD_PROP":"Period",
        "POSTING_DATE_PROP":"PostingDate",
        "DOCUMENT_DATE_PROP":"DocumentDate",
        "REPORT_PROP": "Report",
        "CompanyCode": {
            "cols": [
                {
                    "label": "Company Code",
                    "template": "CompanyCode"
                },
                {
                    "label": "Company Code Name",
                    "template": "CompanyCodeName"
                }
            ]
        },
        "FIELDS": {
            "CompanyCode" : {
                "key": "CompanyCode",
                "text": "CompanyCodeName"
            }
        },
        "EXPORT_FIELDS": [
            {
                "label": 'Period',
                "type": "EdmType.String",
                "property": 'PostingPeriod'
            },
            {
                "label": 'Fiscal Year',
                "type": "EdmType.String",
                "property": 'FiscalYear'
            },
            {
                "label": 'Message',
                "type": "EdmType.String",
                "property": 'Message'
            },
            {
                "label": 'Document Date',
                "type": "EdmType.Date",
                "property": 'DocumentDate'
            },
            {
                "label": 'Posting Date',
                "type": "EdmType.Date",
                "property": 'PostingDate'
            },
            {
                "label": 'Sender Country',
                "type": "EdmType.String",
                "property": 'SenderCountry'
            },
            {
                "label": 'Sender Company Code',
                "type": "EdmType.String",
                "property": 'SenderCompanyCode'
            },
            {
                "label": 'FI Document Number',
                "type": "EdmType.String",
                "property": 'FIDocumentNumber'
            },
            {
                "label": 'Sender JV',
                "type": "EdmType.String",
                "property": 'SenderJV'
            },
            {
                "label": 'Sender Equity Type',
                "type": "EdmType.String",
                "property": 'SenderEquityType'
            },
            {
                "label": 'Sender Cost Center',
                "type": "EdmType.String",
                "property": 'SenderCostCenter'
            },
            {
                "label": 'Sender WBS Element',
                "type": "EdmType.String",
                "property": 'SenderWBSElement'
            },
            {
                "label": 'Sender Cost Element',
                "type": "EdmType.String",
                "property": 'SenderCostElement'
            },
            {
                "label": 'Sender Activity',
                "type": "EdmType.String",
                "property": 'SenderActivity'
            },
            {
                "label": 'Receiver Country',
                "type": "EdmType.String",
                "property": 'ReceiverCountry'
            },
            {
                "label": 'Receiver Company Code',
                "type": "EdmType.String",
                "property": 'ReceiverCompanyCode'
            },
            {
                "label": 'Receiver CC FIDocument Number',
                "type": "EdmType.String",
                "property": 'ReceiverCCFIDocumentNumber'
            },
            {
                "label": 'Receiver CC Fiscal Year',
                "type": "EdmType.String",
                "property": 'ReceiverCCFiscalYear'
            },
            {
                "label": 'Receiver JV',
                "type": "EdmType.String",
                "property": 'ReceiverJV'
            },
            {
                "label": 'Receiver Equity Type',
                "type": "EdmType.String",
                "property": 'ReceiverEquityType'
            },
            {
                "label": 'Receiver Cost Center',
                "type": "EdmType.String",
                "property": 'ReceiverCostCenter'
            },
            {
                "label": 'Receiver WBS Element',
                "type": "EdmType.String",
                "property": 'ReceiverWBSElement'
            },
            {
                "label": 'Receiver Cost Element',
                "type": "EdmType.String",
                "property": 'ReceiverCostElement'
            },
            {
                "label": 'Receiver Activity',
                "type": "EdmType.String",
                "property": 'ReceiverActivity'
            },
            {
                "label": 'Agreement Type',
                "type": "EdmType.String",
                "property": 'AgreementType'
            },
            {
                "label": 'Currency',
                "type": "EdmType.String",
                "property": 'Currency'
            },
            {
                "label": 'Transaction Currency',
                "type": "EdmType.String",
                "property": 'TransactionCurrency'
            },
            {
                "label": 'Amount in Transaction Currency',
                "type": "EdmType.Number",
                "scale": 2,
                "delimiter": true,
                "property": 'AmountInTransactionCurrency',
            },
            {
                "label": 'Company Code Currency',
                "type": "EdmType.String",
                "property": 'CompanyCodeCurrency'
            },
            {
                "label": 'Amount in Company Code Currency',
                "type": "EdmType.Number",
                "scale": 2,
                "delimiter": true,
                "property": 'AmountInCompanyCodeCurrency',
            },
            {
                "label": 'Global Currency',
                "type": "EdmType.String",
                "property": 'GlobalCurrency'
            },
            {
                "label": 'Amount in Global Currency',
                "type": "EdmType.Number",
                "scale": 2,
                "delimiter": true,
                "property": 'AmountInGlobalCurrency',
            },
            {
                "label": 'Customer',
                "type": "EdmType.String",
                "property": 'Customer'
            },
            {
                "label": 'Output Tax Code',
                "type": "EdmType.String",
                "property": 'OutputTaxCode'
            },
            {
                "label": 'Sender ICO Adj GL',
                "type": "EdmType.String",
                "property": 'SenderICOAdjGL'
            },
            {
                "label": 'Vendor',
                "type": "EdmType.String",
                "property": 'Vendor'
            },
            {
                "label": 'Input Tax Code',
                "type": "EdmType.String",
                "property": 'InputTaxCode'
            },
            {
                "label": 'WHT',
                "type": "EdmType.String",
                "property": 'WHT'
            },
            {
                "label": 'Receiver ICO Adj GL',
                "type": "EdmType.String",
                "property": 'ReceiverICOAdjGL'
            },
            {
                "label": 'Summary Invoice Indicator',
                "type": "EdmType.String",
                "property": 'SummaryInvoiceIndicator'
            },
            {
                "label": 'Markup Percentage',
                "type": "EdmType.String",
                "property": 'MarkupPercentage'
            },
            {
                "label": 'Markup GL',
                "type": "EdmType.String",
                "property": 'MarkupGL'
            },
            {
                "label": 'Posted Document Number SCC',
                "type": "EdmType.String",
                "property": 'PostedDocumentNumberSCC'
            },
            {
                "label": 'Posted Document FY SCC',
                "type": "EdmType.String",
                "property": 'PostedDocumentFYSCC'
            },
            {
                "label": 'Posted Document Number RCC',
                "type": "EdmType.String",
                "property": 'PostedDocumentNumberRCC'
            },
            {
                "label": 'Posted Document FY RCC',
                "type": "EdmType.String",
                "property": 'PostedDocumentFYRCC'
            }
        ]
    };
});