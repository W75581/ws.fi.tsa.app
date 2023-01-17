sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/m/ColumnListItem',
    'sap/m/Label',
    'sap/m/SearchField',
    'sap/m/Token',
    'sap/m/MessageToast',
    'sap/m/MessageBox',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/ui/export/library',
	'sap/ui/export/Spreadsheet',
    'ws/fi/tsa/app/utils/Validator'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, ColumnListItem, Label, SearchField, Token, MessageToast, MessageBox, Filter, FilterOperator, exportLibrary, Spreadsheet, Validator) {
        "use strict";

        return Controller.extend("ws.fi.tsa.app.controller.Main", {
            
            /* =========================================================== */
            /* lifecycle methods                                           */
            /* =========================================================== */

            /**
             * Called when the worklist controller is instantiated.
             * @public
             */
            onInit: function () {
                this._oConstant = this.getOwnerComponent() ? this.getOwnerComponent().getModel("constant").getData() : undefined;
                this._oModel = this.getOwnerComponent().getModel();

                var oFormObject = this._oConstant["FORM_OBJECT"];
                var oModel = new sap.ui.model.json.JSONModel(oFormObject);
                this.getView().setModel(oModel,"mdlForm");
                this._oFormMdl = this.getView().getModel("mdlForm");

                this._setDefaultPstDate();
            },

            /**
             * Sets the initial posting date which is 
             * end date of the month.
             * @public
             */
             _setDefaultPstDate: function() {
                var sCurrDate = new Date();
                var iCurrMonth = sCurrDate.getMonth();
                var iCurrYear = sCurrDate.getFullYear();
                var sLastDay = new Date(iCurrYear, iCurrMonth + 1, 0);
                this._oFormMdl.setProperty("/PostingDate", sLastDay);
                this._oFormMdl.setProperty("/DocumentDate", sLastDay);
            },

            /**
             * Returns the validator.
             * @public
             * @returns {object} returns the validator
             */
             _getValidator: function () {
                if (!this._oValidator) {
                    this._oValidator = new Validator();
                }
                return this._oValidator;
            },

            /**
             * Getter for the resource bundle.
             * @private
             * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
             */
            _getResourceBundle: function () {
                return this.getOwnerComponent().getModel("i18n").getResourceBundle();
            },

            /**
             * Gets text from the resource bundle.
             * @private
             * @param {string} sResource name of the resource
             * @param {string[]} aParameters Array of strings, variables for dynamic content
             * @returns {string} the text
            */
            _getResourceText: function (sResource, aParameters) {
                return this._getResourceBundle().getText(sResource, aParameters);
            },

            /**
             * Gets smart table instance
             * @private
             */
             _getSmartTableById: function () {
                return this.getView().byId("idMainTable");
            },

            /**
             * Gets instance of Create Request dialog
             * @private
             */
            _getPostTblDialog: function () {
                if (!this._oPostTblDiag) {
                    this._oPostTblDiag = sap.ui.xmlfragment("idPostTable", "ws.fi.tsa.app.view.fragments.PostedTable",
                        this);
                        this._oPostTblDiag.setModel(this._oFormMdl);
                    this.getView().addDependent(this._oPostTblDiag);
                }
                return this._oPostTblDiag;
            },

            /**
             * Handles when user selects the Value Help for the multi-input
             * @param {sap.ui.base.Event} oEvent from the multi-input
             * @public
             */
            onValueHelpRequested: function() {
                this._oBasicSearchField = new SearchField();
                if (!this.pDialog) {
                    this.pDialog = this.loadFragment({
                        name: "ws.fi.tsa.app.view.fragments.CompanyCodeVH"
                    });
                }
                this.pDialog.then(function(oDialog) {
                    var oFilterBar = oDialog.getFilterBar();
                    this._oVHD = oDialog;
                    // Initialise the dialog with model only the first time. Then only open it
                    if (this._bDialogInitialized) {
                        // Re-set the tokens from the input and update the table
                        oDialog.setTokens([]);
                        oDialog.setTokens(this._oMultiInput.getTokens());
                        oDialog.update();
    
                        oDialog.open();
                        return;
                    }
                    this.getView().addDependent(oDialog);
    
                    // Set Basic Search for FilterBar
                    oFilterBar.setFilterBarExpanded(false);
                    oFilterBar.setBasicSearch(this._oBasicSearchField);
    
                    // Trigger filter bar search when the basic search is fired
                    this._oBasicSearchField.attachSearch(function() {
                        oFilterBar.search();
                    });
    
                    oDialog.getTableAsync().then(function (oTable) {
    
                        oTable.setModel(this.oProductsModel);
    
                        // For Desktop and tabled the default table is sap.ui.table.Table
                        if (oTable.bindRows) {
                            // Bind rows to the ODataModel and add columns
                            oTable.bindAggregation("rows", {
                                path: "/CompanyCode",
                                events: {
                                    dataReceived: function() {
                                        oDialog.update();
                                    }
                                }
                            });
                            oTable.addColumn(new UIColumn({label: "Company Code", template: "CompanyCode"}));
                            oTable.addColumn(new UIColumn({label: "Company Name", template: "CompanyName"}));
                        }
    
                        // For Mobile the default table is sap.m.Table
                        if (oTable.bindItems) {
                            // Bind items to the ODataModel and add columns
                            oTable.bindAggregation("items", {
                                path: "/CompanyCode",
                                template: new ColumnListItem({
                                    cells: [new Label({text: "{CompanyCode}"}), new Label({text: "{CompanyCode}"})]
                                }),
                                events: {
                                    dataReceived: function() {
                                        oDialog.update();
                                    }
                                }
                            });
                            oTable.addColumn(new MColumn({header: new Label({text: "Company Code"})}));
                            oTable.addColumn(new MColumn({header: new Label({text: "Company Name"})}));
                        }
                        oDialog.update();
                    }.bind(this));
    
                    oDialog.setTokens(this._oMultiInput.getTokens());
    
                    // set flag that the dialog is initialized
                    this._bDialogInitialized = true;
                    oDialog.open();
                }.bind(this));
            },
    
            /**
             * Called to set the tokens and close the Value Help dialog.
             * @param {sap.ui.base.Event} oEvent from the ok button
             * @public
             */
            onValueHelpOkPress: function (oEvent) {
                var aTokens = oEvent.getParameter("tokens");
                this._oMultiInput.setTokens(aTokens);
                this._oVHD.close();
            },
    
            /**
             * Called to close the Value Help dialog.
             * @public
             */
            onValueHelpCancelPress: function () {
                this._oVHD.close();
            },

            /**
             * Handles when user uses the search functionality 
             * from the Value Help Dialog 
             * @param {sap.ui.base.Event} oEvent from the ok button
             * @public
             */
             onSearchforVH: function (oEvent) {
                var sSearchQuery = this._oBasicSearchField.getValue(),
                    aSelectionSet = oEvent.getParameter("selectionSet"),
                    aFilters = aSelectionSet && aSelectionSet.reduce(function (aResult, oControl) {
                        if (oControl.getValue()) {
                            aResult.push(new Filter({
                                path: oControl.getName(),
                                operator: FilterOperator.Contains,
                                value1: oControl.getValue()
                            }));
                        }

                        return aResult;
                    }, []);

                aFilters.push(new Filter({
                    filters: [
                        new Filter({ path: this.sCurrMultiInput, operator: FilterOperator.Contains, value1: sSearchQuery })
                    ],
                    and: false
                }));

                this._filterTableVH(new Filter({
                    filters: aFilters,
                    and: true
                }));
            },

            /**
             * Sets the filters on the Value Help Dialog Table
             * @private
             */
             _filterTableVH: function (oFilter) {
                var oVHD = this._oVHD;
                oVHD.getTableAsync().then(function (oTable) {
                    if (oTable.bindRows) {
                        oTable.getBinding("rows").filter(oFilter);
                    }
                    if (oTable.bindItems) {
                        oTable.getBinding("items").filter(oFilter);
                    }
                    oVHD.update();
                });
            },

            /**
             * Update stored fields if it has been removed.
             * @public
             * @param {sap.ui.base.Event} oEvent from the multiinput
             */
            onUpdateTokens: function (oEvent) {
                //Always selecting one
                var oToken = oEvent.getParameter("removedTokens")[0];

                var oMultiInput = oEvent.getSource();
                var oProperties = {};
                oProperties[this._oConstant["COMPANY_CODE_PROP"]] = this._oConstant["COMPANY_CODE_PROP"];

                var sProperty = oProperties[oMultiInput.getName()];
                if (oEvent.getParameter("type") === "removed") {
                    var aKeys = this._oFormMdl.getProperty("/" + sProperty);
                    var iIndex = aKeys.indexOf(oToken.getKey());
                    if (iIndex >= 0) aKeys.splice(iIndex, 1);
                    if (sProperty === COMPANY_CODE_PROP) this._updateFromBRF();
                }
            },

            /**
             * Apply Fiscal Year to Fiscal Year Period as filter.
             * @public
             * @param {sap.ui.base.Event} oEvent from the combobox
             */
            onSelFiscalYear: function(oEvent) {
                var aFilters = [];
                var sFilterValue = oEvent.getSource().getSelectedKey();
                var oFisYrPrd = this.getView().byId("idComboBxFisYrPrd");
                var oBinding = oFisYrPrd.getBinding("items");
                if (sFilterValue){
                    aFilters.push( new Filter("FiscalYear", FilterOperator.EQ, sFilterValue) );
                }
                oBinding.filter(aFilters, sap.ui.model.FilterType.Application);
            },

            /**
             * Generates the Test Run of Report.
             * @public
             */
             onSimulateForm: function () {
                if (!this._getValidator().validate(this.getView().byId("idMainForm"))) {
                    MessageToast.show(this._getResourceText("validationMessage"), {
                        closeOnBrowserNavigation: false
                    });
                    return;
                }

                this._getSmartTableById().rebindTable();
            },

            /**
             * Clears inputs in the form.
             * @public
             */
             onClearForm: function () {
                this._clearControl("idMulInpCompCode", this._oConstant["COMPANY_CODE_PROP"]);
                this._clearControl("idComboBxFisYr", this._oConstant["FISCAL_YEAR_PROP"]);
                this._clearControl("idComboBxFisYrPrd", this._oConstant["FISCAL_PERIOD_PROP"]);
            },

            /**
             * Removes data from a field
             * @private
             */
             _clearControl: function (sId, sProperty) {
                var oControl = this.byId(sId);

                switch (oControl.getMetadata().getName()) {
                    case "sap.m.ComboBox":
                        oControl.setSelectedKey("");
                        this._oFormMdl.setProperty("/" + sProperty, "");
                        break;
                    case "sap.m.MultiInput":
                        oControl.removeAllTokens();
                        this._oFormMdl.setProperty("/" + sProperty, []);
                }
            },

            /**
             * Binds the latest data to the Smart Filter Table.
             * @public
             * @param {sap.ui.base.Event} oEvent from the smart filter table
             */
             onBeforeRebindTable: function(oEvent) {
                var oBindingParams = oEvent.getParameter("bindingParams");
                var aFilters = this._getFilters();
                oBindingParams.filters = aFilters;
            },

            /**
             * Posts the records that are selected.
             * @public
             */
             onConfirmPost: function() {
                var aItems = this._getSmartTableById().getTable().getItems();
                debugger;
                
                if (aItems.length < 1) {
                    MessageToast.show(this._getResourceText("saveErrMessage"));
                    return;
                }

                var aRecords = [];

                aItems.forEach((value) => {
                    var oObj = value.getBindingContext().getObject();
                    delete oObj.__metadata;
                    aRecords.push(oObj);
                });

                this._oModel.setDeferredGroups(["group1"]);
                var mParameters = {groupId:"group1",success: this._handlePostSuccess.bind(this),error: this._handlePostError.bind(this)};

                for (let i = 0; i < aRecords.length; i++) {
                    this._oModel.create("/TSAPosting", aRecords[i], mParameters);
                }
                
                this._oModel.submitChanges(mParameters);

            },

            /**
             * Handles the Post Success.
             * @private
             */
            _handlePostSuccess: function(data) {
                if (!data.__batchResponses) {
                    this._oFormMdl.setProperty("/postRec", [data]);
                
                    if (this._oPostTblDiag) {
                        this._oPostTblDiag.open();
                    } else {
                        var oPromise = this.loadFragment({
                            id: "idPostTable",
                            name: "ws.fi.tsa.app.view.fragments.PostedTable"
                        });

                        oPromise.then(function (oDialog) {
                            this._oPostTblDiag = oDialog;
                            this._oPostTblDiag.open();
                        }.bind(this));
                    }

                    
                }
            },

            /**
             * Handles the Post Errors.
             * @private
             */
            _handlePostError: function(oResponse) {
                MessageBox.error(this._getResourceText("postErrMessage"), {
                    title: "Error",
                    id: "idMsgBox",
                    details: oResponse.responseText,
                    contentWidth: "100px"
                });
            },

            /**
             * Exports Data from the Post Table Dialog.
             * @public
             */
             onExportPosted: function () {
                var oTable = this.byId("idPostTable--idTablePostedRecs");
                console.log(oTable);
                if (oTable) {
                    var oRowBinding = oTable.getBinding("items");
                    var aCols = this._oConstant["EXPORT_FIELDS"];

                    var oSheet = new Spreadsheet({
                        workbook: { columns: aCols },
                        dataSource: oRowBinding,
                        fileName: 'Posted Journal Entries.xlsx'
                    });

                    oSheet.build().finally(function() {
                        oSheet.destroy();
                    });
                }
            },

            /**
             * Closes the Post Table Dialog.
             * @public
             */
            onPostTblDiagClose: function() {
                if (this._oPostTblDiag) this._oPostTblDiag.close();
            },

            /**
             * Event handler for navigating back.
             * Navigate back in the browser history
             * @public
             */
            onNavBack: function () {
                // eslint-disable-next-line sap-no-history-manipulation
                history.go(-1);
            }
        });
    });
