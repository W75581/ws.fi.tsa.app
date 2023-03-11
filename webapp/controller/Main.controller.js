sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/util/File",
    "sap/ui/core/library",
    "sap/ui/core/Core",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/PDFViewer",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "sap/base/security/URLListValidator"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, FileUtil, coreLibrary, Core,
            JSONModel, Filter, FilterOperator,
            MessageToast, MessageBox, PDFViewer,
            Spreadsheet, exportLibrary,
            URLListValidator) {
        "use strict";

        var MessageType = coreLibrary.MessageType;
        var EdmType = exportLibrary.EdmType;

        return Controller.extend("ws.fi.tsa.app.controller.Main", {
            
            /* =========================================================== */
            /* lifecycle methods                                           */
            /* =========================================================== */

            /**
             * Called when the worklist controller is instantiated.
             * @public
             */
            onInit: function () {
                URLListValidator.add("blob");

                var oComponent = this.getOwnerComponent();
                var oView = this.getView();

                this._oModel = oComponent.getModel();
                this._oModel.setSizeLimit(999999999);

                this._oConstant = oComponent.getModel("constant").getData();
                var oFormObject = JSON.parse(JSON.stringify(this._oConstant.FORM_OBJECT)); //deep copy
                this._oFormMdl = new JSONModel(oFormObject);
                oView.setModel(this._oFormMdl, "mdlForm");

                this._oSmartTable = this.byId("idMainTable");
                this._oSmartFilterBar = this.byId("idSFBFilter");
                this._oMessagePopover = this.byId("idMPMessages");
                this._oPostDateInput = this.byId("idMulInpPstDte");
                this._oDocDateInput = this.byId("idMulInpDocDte");

                this._oMessageIndicatorButton = this.byId("idMIButton");
                this._oMessageIndicatorButton.addEventDelegate({
                    onAfterRendering: () => {
                        if (this._oMessagePopover) {
                            this._oMessagePopover.openBy(this._oMessageIndicatorButton);
                        }
                    }
                });

                this._oMessageManager = Core.getMessageManager();
                this._oMessageManager.removeAllMessages();
                this._oMessageMdl = this._oMessageManager.getMessageModel();
                oView.setModel(this._oMessageMdl, "message");

                this._handleMetadataLoading();

                oComponent.getRouter().getRoute("RouteMain").attachPatternMatched(this._onTSAMatched, this);
            },

            /**
             * Reset the Form Model everytime the page is loaded.
             * @private
             */
            _onTSAMatched: function () {
                if (this._oSmartTable) this._oSmartTable.getTable().clearSelection();
                if (this._oFormMdl) this._oFormMdl.setData(JSON.parse(JSON.stringify(this._oConstant.FORM_OBJECT)));
                if (this._oPDFURI) URL.revokeObjectURL(this._oPDFURI);
                if (this._oMessageManager && this._oMessageMdl) this._oMessageMdl.setData([]);
                
                this._setDefaultPstDate();
            },

            /**
             * Called when the worklist controller is destroyed.
             * @public
             */
            onExit: function () {
                URL.revokeObjectURL(this._oPDFURI);
            },

            /**
             * Sets the initial posting date which is 
             * end date of the month.
             * @public
             */
             _setDefaultPstDate: function() {
                var oCurrDate = new Date();
                var iCurrMonth = oCurrDate.getMonth();
                var iCurrYear = oCurrDate.getFullYear();
                var oLastDay = null;
                try {
                    oLastDay = this._oConstant.BASE_DATE_FORMAT.parse(
                        this._oConstant.NON_UTC_FORMAT.format(new Date(iCurrYear, iCurrMonth + 1, 0))
                    );
                } catch (oEx) {}
                
                if (oLastDay) {
                    this._oFormMdl.setProperty("/PostingDate", oLastDay);
                    this._oFormMdl.setProperty("/DocumentDate", oLastDay);
                }
            },

            /**
             * Handle initialized event of SmartFilterbar.
             * Add a change handler to period change event
             * @public
             * @param {sap.ui.base.Event} oEvent from the smart filter bar
             */
            onSmartFilterInitialized: function (oEvent) {
                var oFilterBar = oEvent.getSource();

                //non-elegant solution until made available by framework
                var oPeriodControl = null, oFiscalYearControl = null;
                try {
                    oPeriodControl = oFilterBar.getControlByKey("Period"); //deprecated as of 1.99
                    oFiscalYearControl = oFilterBar.getControlByKey("FiscalYear"); //deprecated as of 1.99
                } catch (oEx) { console.log(oEx); }
                
                if (oPeriodControl) oPeriodControl.attachChange(this._onPeriodChanged.bind(this));
                if (oFiscalYearControl) oFiscalYearControl.attachChange(this._onFYChanged.bind(this));
            },

            /**
             * Update posting and document date based on selected period
             * @private
             */
            _onPeriodChanged: function (oEvent) {
                if (this._oSmartFilterBar && !this._oFormMdl.getProperty("/Report")) {
                    var oFilterData = this._oSmartFilterBar.getFilterData();
                    this._getPeriodEndDate(oFilterData.FiscalYear ?
                        oFilterData.FiscalYear :
                        this._oConstant.BASE_YEAR,
                        oEvent.getParameter("value"));
                }
            },

            /**
             * Update posting and document date based on selected FY
             * @private
             */
            _onFYChanged: function (oEvent) {
                if (this._oSmartFilterBar && !this._oFormMdl.getProperty("/Report")) {
                    var oFilterData = this._oSmartFilterBar.getFilterData();
                    this._getPeriodEndDate(oEvent.getParameter("value"),
                        oFilterData.Period ?
                        oFilterData.Period : "");
                }
            },

            /**
             * Capture period end date based on Fiscal Year and Period
             * @private
             * @param {string} sFiscalYear Year to check
             * @param {string} sPeriod Period to check
             */
            _getPeriodEndDate: function (sFiscalYear, sPeriod) {
                if (sFiscalYear && sPeriod) {
                    this._oFormMdl.setProperty("/SearchEnabled", false);
                    this._oPostDateInput.setBusy(true);
                    this._oDocDateInput.setBusy(true);

                    var sKey = this._oModel.createKey("/ZFI_IQ_FY_PERIOD", {
                        FiscalPeriod: sPeriod,
                        FiscalYear: sFiscalYear
                    });

                    new Promise((fnResolve, fnReject) => {
                        this._oModel.read(sKey, {
                            success: fnResolve,
                            error: fnReject
                        });
                    }).then((oData) => {
                        if (oData && oData.FiscalPeriodEndDate) {
                            var oDateFormat = this._oConstant.BASE_DATE_FORMAT;

                            this._oFormMdl.setProperty("/PostingDate", oDateFormat.parse(oDateFormat.format(oData.FiscalPeriodEndDate)));
                            this._oFormMdl.setProperty("/DocumentDate", oDateFormat.parse(oDateFormat.format(oData.FiscalPeriodEndDate)));
                        }
                    }).catch(() => {
                        this._oFormMdl.setProperty("/ShowFooter", true);
                        this._oFormMdl.setProperty("/Posting", true); //just to hide the posting button
                        this._oFormMdl.setProperty("/ExportEnabled", false);
                        this._oFormMdl.setProperty("/PrintOut", false);

                        this._setDefaultPstDate();
                    }).finally(() => {
                        this._oFormMdl.setProperty("/SearchEnabled", true);
                        this._oPostDateInput.setBusy(false);
                        this._oDocDateInput.setBusy(false);
                    });
                } else {
                    this._setDefaultPstDate();
                    this._oFormMdl.setProperty("/SearchEnabled", true);
                }
            },

            /**
             * Handle onAssignedFiltersChanged event of SmartFilterbar.
             * Display the filters as text when collapsed
             * @public
             */
            onAssignedFiltersChanged: function() {
                if (this._oSmartFilterBar && this._oFormMdl) {
                    this._oFormMdl.setProperty("/FiltersSnappedText", this._oSmartFilterBar.retrieveFiltersWithValuesAsText());
                }
            },

            /**
             * Handle filterChange event of SmartFilterbar.
             * Reset footers when any of the filters are changed
             * @public
             */
            onFilterChanged: function () {
                this._resetFooterStatus();
            },

            /**
             * Gets text from the resource bundle.
             * @private
             * @param {string} sResource name of the resource
             * @param {string[]} aParameters Array of strings, variables for dynamic content
             * @returns {string} the text
            */
            _getResourceText: function (sResource, aParameters) {
                return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sResource, aParameters);
            },

            /**
             * Handle beforeVariantFetch event of SmartFilterbar.
             * Save custom controls
             * @public
             */
            onBeforeVariantFetch: function () {
                if (this._oSmartFilterBar) {
                    var bReport = this._oFormMdl.getProperty("/Report");
                    var oFilterData = {
                        _CUSTOM: {
                            CustomReport: bReport
                        }
                    };

                    if (!bReport) {
                        oFilterData._CUSTOM.CustomPostingDate = this._oFormMdl.getProperty("/PostingDate");
                        oFilterData._CUSTOM.CustomDocumentDate = this._oFormMdl.getProperty("/DocumentDate");
                    }

                    this._oSmartFilterBar.setFilterData(oFilterData);
                }
            },

            /**
             * Handle afterVariantLoad event of SmartFilterbar.
             * Load values for custom controls
             * @public
             */
            onAfterVariantLoad: function () {
                if (this._oSmartFilterBar) {
                    var oFilters = this._oSmartFilterBar.getFilterData();

                    if (oFilters._CUSTOM && this._oFormMdl) {
                        var bReport = oFilters._CUSTOM.CustomReport;
                        this._oFormMdl.setProperty("/Report", bReport);

                        if (!bReport) {
                            var oDateFormat = this._oConstant.VAR_DATE_FORMAT;
                            try {
                                this._oFormMdl.setProperty("/PostingDate", oDateFormat.parse(oFilters._CUSTOM.CustomPostingDate));
                                this._oFormMdl.setProperty("/DocumentDate", oDateFormat.parse(oFilters._CUSTOM.CustomDocumentDate));
                            } catch (oEx) {}
                        } else {
                            this._setDefaultPstDate();
                        }
                    }

                    if (!oFilters.Period && !oFilters.FiscalYear) {
                        this._setDefaultPstDate();
                    }
                }
            },

            /**
             * Handle select of Report Checkbox.
             * @public
             */
            onSelectCheckBox: function () {
                if (this._oSmartFilterBar) this._oSmartFilterBar.fireFilterChange();
            },

            /**
             * Handle search event of SmartFilterbar.
             * Set Simulate property as true
             * @public
             */
            onActivateSimulate: function () {
                this._oFormMdl.setProperty("/Simulate", true);
            },

            /**
             * Binds the latest data to the Smart Table.
             * @public
             * @param {sap.ui.base.Event} oEvent from the smart table
             */
             onBeforeRebindTable: function(oEvent) {
                var oTable = oEvent.getSource().getTable();
                var oBindingParams = oEvent.getParameter("bindingParams");
                var bSimulate = this._oFormMdl.getProperty("/Simulate");
                var bReport = this._oFormMdl.getProperty("/Report");

                oBindingParams.filters.push(new Filter("Report", FilterOperator.EQ, bReport));
                oBindingParams.filters.push(new Filter("Test", FilterOperator.EQ, (bSimulate && !bReport)));
                
                if (!bReport) {
                    //add posting dates
                    var oPostingDate = this._oFormMdl.getProperty("/PostingDate");
                    var oDocumentDate = this._oFormMdl.getProperty("/DocumentDate");

                    oBindingParams.filters.push(new Filter("PostingDate", FilterOperator.EQ, oPostingDate));
                    oBindingParams.filters.push(new Filter("DocumentDate", FilterOperator.EQ, oDocumentDate));

                    //add Document Number Filter
                    if (!bSimulate) {
                        var arrIndices = this._oFormMdl.getProperty("/SelectedIndices");
                        var arrDocNumFilter = [];

                        if (arrIndices && arrIndices.length > 0) {
                            arrIndices.forEach((iIndex) => {
                                var oRow = oTable.getContextByIndex(iIndex).getObject();
            
                                if (oRow) {
                                    arrDocNumFilter.push(new Filter("FIDocumentNumber", FilterOperator.EQ, oRow.FIDocumentNumber));
                                }
                            });
                        }

                        if (arrDocNumFilter.length > 0) {
                            oBindingParams.filters.push(new Filter({
                                filters: arrDocNumFilter,
                                and: false
                            }));
                        }
                    }
                }

                this._resetFooterStatus();
                this._addBindingListener(oBindingParams, "dataReceived", this._onDataReceived.bind(this));
            },

            /**
             * Hides the footer and removes messages from the message Indicator
             * @private
             */
            _resetFooterStatus: function () {
                this._oFormMdl.setProperty("/Posting", false);
                this._oFormMdl.setProperty("/ItemsSelected", false);
                this._oMessageMdl.setData([]);
                if (this._oMessagePopover) this._oMessagePopover.close();
                this._oFormMdl.setProperty("/ShowFooter", false);
                this._oFormMdl.setProperty("/ExportEnabled", false);
                this._oFormMdl.setProperty("/PrintOut", false);
            },

            /**
             * Handles dataReceived event of SmartTable
             * @private
             * @param {sap.ui.base.Event} oEvent
             */
            _onDataReceived: function (oEvent) {
                var arrData = oEvent.getParameter("data")["results"];
                var arrDocNum = [];
                var bReport = this._oFormMdl.getProperty("/Report");
                var bSimulate = this._oFormMdl.getProperty("/Simulate");

                if (arrData.length > 0) {
                    this._oFormMdl.setProperty("/Rows", arrData);
                    this._oFormMdl.setProperty("/ExportEnabled", true);
                    this._oFormMdl.setProperty("/SelectedIndices", []);
                    if (this._oSmartTable) this._oSmartTable.getTable().clearSelection();

                    if (bReport || !bSimulate) { //either report or posting
                        var arrUniqueEntries = [];
                        var sAfterPostMsg = this._getResourceText("afterPostMessage");
                        var arrMessages = [{
                            message: this._getResourceText("afterPostTitle"),
                            additionalText: sAfterPostMsg,
                            description: sAfterPostMsg,
                            type: MessageType.Information
                        }];

                        arrData.forEach((oResult) => {
                            if(oResult.PostedDocumentNumberSCC
                                && arrUniqueEntries.indexOf(oResult.PostedDocumentNumberSCC) < 0) {
                                arrUniqueEntries.push(oResult.PostedDocumentNumberSCC);
                                arrDocNum.push({DocumentNumber:oResult.PostedDocumentNumberSCC});
                            }

                            if (!bReport && !bSimulate) { //posting only
                                var arrKey = [
                                    oResult.SenderCountry,
                                    oResult.CompanyCode,
                                    oResult.FIDocumentNumber,
                                    oResult.FiscalYear,
                                    oResult.Period
                                ];

                                if (oResult.PostedDocumentNumberSCC || oResult.PostedDocumentNumberRCC) {
                                    var sDocNum = oResult.PostedDocumentNumberSCC;
                                    if (sDocNum && oResult.PostedDocumentNumberRCC) {
                                        sDocNum = sDocNum + " " + oResult.PostedDocumentNumberRCC;
                                    } else {
                                        sDocNum = oResult.PostedDocumentNumberRCC;
                                    }

                                    arrMessages.push({
                                        message: arrKey,
                                        additionalText: sDocNum,
                                        description: this._getResourceText("docCreated", [sDocNum]),
                                        type: MessageType.Success
                                    });
                                } else if (oResult.Message) {
                                    arrMessages.push({
                                        message: arrKey,
                                        additionalText: oResult.Message,
                                        description: oResult.Message,
                                        type: MessageType.Error
                                    });
                                }
                            }
                        });

                        this._oFormMdl.setProperty("/PrintOut", arrDocNum.length > 0);

                        if (!bReport && !bSimulate) { //posting only
                            if (arrMessages && arrMessages.length) this._oMessageMdl.setData(arrMessages);
                            this._oFormMdl.setProperty("/Posting", true);
                            this._oFormMdl.setProperty("/ShowFooter", true);
                        }
                    } else {
                        this._oFormMdl.setProperty("/Posting", false);
                        this._oFormMdl.setProperty("/ShowFooter", true);
                    }
                }
                
                this._oFormMdl.setProperty("/PostedDocumentNumberSCC", arrDocNum);
            },

            /**
             * Handles custom export functionality. Export client data instead of server data.
             * @public
             */
            onExportToExcel: function () {
                var arrRows = this._oFormMdl.getObject("/Rows");

                var oSheet = new Spreadsheet({
                    workbook: {
                        columns: this._arrExportColumns
                    },
                    dataSource: arrRows,
                    fileName: this._oConstant.EXPORT_FILE_NAME,
                    showProgress: true
                });

                oSheet.build().finally(function() {
                    oSheet.destroy();
                });
            },

            /**
             * Handles button press of Message Indicator button
             * @private
             * @param {sap.ui.base.Event} oEvent
             */
            onOpenMessages: function (oEvent) {
                var oButton = oEvent.getSource();
                if (this._oMessagePopover) this._oMessagePopover.toggle(oButton);
            },

            /**
             * Handles event for when a row is selected/deselected
             * @public
             * @param {sap.ui.base.Event} oEvent
             */
            onRowSelected: function (oEvent) {
                var oTable = oEvent.getSource();
                var arrIndices = oTable.getSelectedIndices();

                this._oFormMdl.setProperty("/ItemsSelected", arrIndices.length > 0);
            },

            /**
             * Posts the records that are selected.
             * @public
             */
            onConfirmPost: function() {
                var oTable = this._oSmartTable.getTable();
                var arrIndices = oTable.getSelectedIndices();

                if (arrIndices.length < 1) {
                    MessageToast.show(this._getResourceText("saveErrMessage"));
                    return;
                }

                MessageBox.confirm(this._getResourceText("confirmPosting"), {
                    onClose: (oAction) => {
                        if (oAction === MessageBox.Action.YES) {
                            this._oFormMdl.setProperty("/Simulate", false);
                            this._oFormMdl.setProperty("/SelectedIndices", arrIndices);
                            this._oSmartTable.rebindTable();
                        }
                    },
                    actions: [
                        MessageBox.Action.YES,
                        MessageBox.Action.NO
                    ],
                    emphasizedAction: MessageBox.Action.NO
                });
            },

            /**
             * Retrieves generated Summary PDF from backend.
             * @public
             */
            onPDFSummary: function() {
                this._getPDF(true, false);
            },

            /**
             * Retrieves generated Detailed PDF from backend.
             * @public
             */
            onPDFDetailed: function () {
                this._getPDF(false, true);
            },

            /**
             * Retrieves generated Summary and Detailed PDF from backend.
             * @public
             */
            onPDFBoth: function () {
                this._getPDF(true, true);
            },

            /**
             * Retrieves generated PDF from backend.
             * @private
             * @param {boolean} bSummary Identifies if Summary
             * * @param {boolean} bDetailed Identifies if Detailed
             */
            _getPDF: function (bSummary, bDetailed) {
                if (this._oSmartFilterBar) {
                    var aFilters = this._oSmartFilterBar.getFilters(["CompanyCode", "FiscalYear", "Period"]);

                    var arrDocNums = this._oFormMdl.getProperty("/FIDocumentNumber");
                    var arrDocNumFilter = [];
                    arrDocNums.forEach((sDocNum) => {
                        arrDocNumFilter.push(new Filter("FIDocumentNumber", FilterOperator.EQ, sDocNum));
                    });
                    if (arrDocNumFilter.length > 0) aFilters.push(new Filter({ filters: arrDocNumFilter, and: false }));

                    aFilters.push(new Filter("Summary", FilterOperator.EQ, bSummary));
                    aFilters.push(new Filter("Detailed", FilterOperator.EQ, bDetailed));

                    if (aFilters && aFilters.length > 0) {
                        this._oFormMdl.setProperty("/Busy", true);
    
                        this._oModel.read("/PrintOut", {
                            filters: aFilters,
                            success: (oData) => {
                                if (oData && oData.results && oData.results.length > 0) {
                                    this._displayPDF(oData.results[0]); //expecting only a single response
                                    this._oFormMdl.setProperty("/Busy", false);
                                }
                            },
                            error: (oError) => {
                                this._oFormMdl.setProperty("/Busy", false);
                                this._oFormMdl.setProperty("/Posting", true); //just to hide the posting button

                                this._oMessageMdl.setData([
                                    {
                                        message: this._getResourceText("pdfErrMessage"),
                                        description: oError,
                                        type: MessageType.Error
                                    }
                                ]);

                                this._oFormMdl.setProperty("/ShowFooter", true);
                            }
                        });
                    }
                }
            },

            /**
             * Display generated PDF from backend.
             * @private
             * @param {Object} oData Data representing PDF response from backend
             */
            _displayPDF: function (oData) {
                var oPDFCode = null;
                var byteArray = null;
                var arrFileName = this._getFileNameArray(oData.FileName);

                if (oData.PDF) {
                    oPDFCode = window.atob(oData.PDF);
                    byteArray = new Uint8Array(oPDFCode.length);

                    for(var i=0; i<oPDFCode.length; i++) {
                        byteArray[i] = oPDFCode.charCodeAt(i);
                    }

                    var oBlob = new Blob([byteArray.buffer], { type: oData.MimeType } );
                    if (this._oPDFURI) URL.revokeObjectURL(this._oPDFURI);
                    this._oPDFURI = URL.createObjectURL(oBlob);

                    if (!this._oPDFViewer) this._oPDFViewer = new PDFViewer({ width: "auto" });
                    this._oPDFViewer.setSource(this._oPDFURI);
                    this._oPDFViewer.setErrorPlaceholderMessage(oData.Message);

                    this._oPDFViewer.downloadPDF = () => {
                        FileUtil.save(
                            byteArray.buffer,
                            arrFileName[0],
                            arrFileName[1],
                            oData.MimeType
                        );
                    };

                    this._oPDFViewer.open();
                } else {
                    this._oFormMdl.setProperty("/Posting", true); //just to hide the posting button

                    this._oMessageMdl.setData([
                        {
                            message: oData.Message,
                            description: oData.Message,
                            type: MessageType.Warning
                        }
                    ]);

                    this._oFormMdl.setProperty("/ShowFooter", true);
                }
            },

            /**
             * Splits a filename string as an array
             * @private
             * @param {string} sFileName Filename string with extension
             * @returns {Array} Array of containing file name [0] and extension [1]
             */
            _getFileNameArray: function (sFileName) {
                var arrFileNameParts = ["Dummy", "pdf"];
                var iExtSeparator = sFileName.lastIndexOf(".");

                if (iExtSeparator > 0) { //dot is not at the beginning of the string
                    arrFileNameParts[0] = (sFileName.substring(0, iExtSeparator)); //FileName
                    arrFileNameParts[1] = (sFileName.substring((iExtSeparator + 1), sFileName.length)); //Extension
                }

                return arrFileNameParts;
            },

            /**
             * Event handler for navigating back.
             * Navigate back in the browser history
             * @public
             */
            onNavBack: function () {
                // eslint-disable-next-line sap-no-history-manipulation
                history.go(-1);
            },

            /**
             * Initialize export columns if metadata is loaded, show error if failed
             * @private
             */
            _handleMetadataLoading: function () {

                if (this._oModel.isMetadataLoadingFailed()) {
                    this._oMessageMdl.setData([
                        {
                            message: this._getResourceText("metadataErrMessage"),
                            type: MessageType.Error
                        }
                    ]);
                    this._oFormMdl.setProperty("/ShowFooter", true);
                } else {
                    this._oModel.metadataLoaded(true).then(() => {
                        var oMetadata = this._oModel.getServiceMetadata();

                        if (oMetadata && oMetadata.dataServices
                            && oMetadata.dataServices.schema
                            && oMetadata.dataServices.schema[0]
                            && oMetadata.dataServices.schema[0].entityType
                            && oMetadata.dataServices.schema[0].entityType.length > 0) {
                            var oEntityType = oMetadata.dataServices.schema[0].entityType.find((oEntityType) => oEntityType.name === this._oConstant.MAIN_ENTITY_TYPE);

                            if (oEntityType) {
                                var oProps = this._getEntityTypePropertyValues(oEntityType);

                                if (oProps) {
                                    this._arrExportColumns = [
                                        {
                                            label: oProps.SenderCountry.label,
                                            property: oProps.SenderCountry.property
                                        },
                                        {
                                            label: oProps.CompanyCode.label,
                                            property: oProps.CompanyCode.property
                                        },
                                        {
                                            label: oProps.FIDocumentNumber.label,
                                            property: oProps.FIDocumentNumber.property,
                                            type: EdmType.Number
                                        },
                                        {
                                            label: oProps.FiscalYear.label,
                                            property: oProps.FiscalYear.property,
                                            type: EdmType.Number
                                        },
                                        {
                                            label: oProps.Period.label,
                                            property: oProps.Period.property,
                                            type: EdmType.Number
                                        },
                                        {
                                            label: oProps.SenderJV.label,
                                            property: oProps.SenderJV.property
                                        },
                                        {
                                            label: oProps.SenderEquityType.label,
                                            property: oProps.SenderEquityType.property
                                        },
                                        {
                                            label: oProps.SenderCostCenter.label,
                                            property: oProps.SenderCostCenter.property
                                        },
                                        {
                                            label: oProps.SenderWBSElement.label,
                                            property: oProps.SenderWBSElement.property
                                        },
                                        {
                                            label: oProps.SenderCostElement.label,
                                            property: oProps.SenderCostElement.property
                                        },
                                        {
                                            label: oProps.SenderActivity.label,
                                            property: oProps.SenderActivity.property
                                        },
                                        {
                                            label: oProps.ReceiverCountry.label,
                                            property: oProps.ReceiverCountry.property
                                        },
                                        {
                                            label: oProps.ReceiverCompanyCode.label,
                                            property: oProps.ReceiverCompanyCode.property
                                        },
                                        {
                                            label: oProps.ReceiverCCFIDocumentNumber.label,
                                            property: oProps.ReceiverCCFIDocumentNumber.property,
                                            type: EdmType.Number
                                        },
                                        {
                                            label: oProps.ReceiverCCFiscalYear.label,
                                            property: oProps.ReceiverCCFiscalYear.property,
                                            type: EdmType.Number
                                        },
                                        {
                                            label: oProps.ReceiverJV.label,
                                            property: oProps.ReceiverJV.property
                                        },
                                        {
                                            label: oProps.ReceiverEquityType.label,
                                            property: oProps.ReceiverEquityType.property
                                        },
                                        {
                                            label: oProps.ReceiverCostCenter.label,
                                            property: oProps.ReceiverCostCenter.property
                                        },
                                        {
                                            label: oProps.ReceiverWBSElement.label,
                                            property: oProps.ReceiverWBSElement.property
                                        },
                                        {
                                            label: oProps.ReceiverCostElement.label,
                                            property: oProps.ReceiverCostElement.property
                                        },
                                        {
                                            label: oProps.ReceiverActivity.label,
                                            property: oProps.ReceiverActivity.property
                                        },
                                        {
                                            label: oProps.AgreementType.label,
                                            property: oProps.AgreementType.property
                                        },
                                        {
                                            label: oProps.Currency.label,
                                            property: oProps.Currency.property
                                        },
                                        {
                                            label: oProps.AmountInTransactionCurrency.label,
                                            property: oProps.AmountInTransactionCurrency.property,
                                            type: EdmType.Number,
                                            scale: 2
                                        },
                                        {
                                            label: oProps.TransactionCurrency.label,
                                            property: oProps.TransactionCurrency.property
                                        },
                                        {
                                            label: oProps.AmountInCompanyCodeCurrency.label,
                                            property: oProps.AmountInCompanyCodeCurrency.property,
                                            type: EdmType.Number,
                                            scale: 2
                                        },
                                        {
                                            label: oProps.CompanyCodeCurrency.label,
                                            property: oProps.CompanyCodeCurrency.property
                                        },
                                        {
                                            label: oProps.AmountInGlobalCurrency.label,
                                            property: oProps.AmountInGlobalCurrency.property,
                                            type: EdmType.Number,
                                            scale: 2
                                        },
                                        {
                                            label: oProps.GlobalCurrency.label,
                                            property: oProps.GlobalCurrency.property
                                        },
                                        {
                                            label: oProps.Customer.label,
                                            property: oProps.Customer.property
                                        },
                                        {
                                            label: oProps.OutputTaxCode.label,
                                            property: oProps.OutputTaxCode.property
                                        },
                                        {
                                            label: oProps.SenderICOAdjGL.label,
                                            property: oProps.SenderICOAdjGL.property
                                        },
                                        {
                                            label: oProps.Vendor.label,
                                            property: oProps.Vendor.property
                                        },
                                        {
                                            label: oProps.InputTaxCode.label,
                                            property: oProps.InputTaxCode.property
                                        },
                                        {
                                            label: oProps.WHT.label,
                                            property: oProps.WHT.property
                                        },
                                        {
                                            label: oProps.ReceiverICOAdjGL.label,
                                            property: oProps.ReceiverICOAdjGL.property
                                        },
                                        {
                                            label: oProps.SummaryInvoiceIndicator.label,
                                            property: oProps.SummaryInvoiceIndicator.property
                                        },
                                        {
                                            label: oProps.MarkupPercentage.label,
                                            property: oProps.MarkupPercentage.property
                                        },
                                        {
                                            label: oProps.MarkupGL.label,
                                            property: oProps.MarkupGL.property
                                        },
                                        {
                                            label: oProps.PostedDocumentNumberSCC.label,
                                            property: oProps.PostedDocumentNumberSCC.property,
                                            type: EdmType.Number
                                        },
                                        {
                                            label: oProps.PostedDocumentFYSCC.label,
                                            property: oProps.PostedDocumentFYSCC.property,
                                            type: EdmType.Number
                                        },
                                        {
                                            label: oProps.PostedDocumentNumberRCC.label,
                                            property: oProps.PostedDocumentNumberRCC.property,
                                            type: EdmType.Number
                                        },
                                        {
                                            label: oProps.PostedDocumentFYRCC.label,
                                            property: oProps.PostedDocumentFYRCC.property,
                                            type: EdmType.Number
                                        },
                                        {
                                            label: oProps.Message.label,
                                            property: oProps.Message.property
                                        }
                                    ];
                                }
                            }
                        }
                    });
                }
            },

            /**
             * Capture Property Labels from Metadata
             * @private
             * @param {object} oEntityType Object containing properties of an Entity Type
             * @returns {object} Key-value pair of properties and labels
             */
            _getEntityTypePropertyValues: function (oEntityType) {
                var oProps = null;

                if (oEntityType && oEntityType.property && oEntityType.property.length > 0) {
                    oProps = {};

                    oEntityType.property.forEach((oProperty) => {
                        if (oProperty.extensions && oProperty.extensions.length > 0) {
                            var oExtensionLabel = oProperty.extensions.find((oExtension) => oExtension.name === "label" );

                            if (oExtensionLabel && oExtensionLabel.value) oProps[oProperty.name] = {
                                property: oProperty.name,
                                label: oExtensionLabel.value,
                                scale: oProperty.scale
                            }; 
                        }
                    });
                }
                
                return oProps;
            },

            /**
             * Event handler for data Received/Requested post sapui5 1.56.
             * Referenced from https://blogs.sap.com/2019/11/04/handle-datareceived-event-in-smart-table-after-version-1.56-in-sapui5/
             * @private
             * @param {Object} oBindingInfo Binding information from calling event
             * @param {string} sEventName Name of Event to Handle
             * @param {function} fHandler Function to execute if the event is triggered
             */
            _addBindingListener: function (oBindingInfo, sEventName, fHandler) {
                oBindingInfo.events = oBindingInfo.events || {};

                if (!oBindingInfo.events[sEventName]) {
                    oBindingInfo.events[sEventName] = fHandler;
                } else {
                    // Wrap the event handler of the other party to add our handler.
                    var fOriginalHandler = oBindingInfo.events[sEventName];
                    oBindingInfo.events[sEventName] = function() {
                        fHandler.apply(this, arguments);
                        fOriginalHandler.apply(this, arguments);
                    };
                }
            },


            /* =========================================================== */
            /* Formatter Functions                                         */
            /* =========================================================== */

            /**
             * Formatter function to remove leading zeroes
             * @public
             * @param sNum String containing digits with leading zeroes
             * @returns String with no leading zeroes
             */
            removeLeadingZeroes: function (sNum) {
                var iNum = parseInt(sNum);

                if (iNum && !isNaN(iNum)) {
                    return iNum + "";
                }

                return sNum;
            }

        });
    });
