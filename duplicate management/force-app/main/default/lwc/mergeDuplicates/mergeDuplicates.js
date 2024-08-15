import { api, LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import mergeAndArchiveDuplicates from '@salesforce/apex/MergeAndArchiveController.mergeAndArchiveDuplicates';

export default class MergeDuplicates extends LightningElement {
    currentStep = "1";
    prevStep;

    @track masterRecord = [];
    @track duplicateRecords = [];
    @track compareDuplicateRecord = [];

    @track masterColumns = [];
    @track duplicateColumns = [];
    @track selectedColumns = [];
    @track allColumns = [];

    @track isLoading = false;
    @track showConfirmationModal = false;
    @track showCompareModal = false;
    @track isRemoveRecordAction = false;

    handleRecordSelection(event) {
        // console.log('In parent', event.detail.selectedRecords);
        if (event.detail.name === "Master Record"){
            this.masterRecord = event.detail.selectedRecords;
            if (this.masterRecord.length > 0) {
                const masterRecordId = this.masterRecord[0].id; // Get the ID of the selected master record
                this.duplicateRecords = this.duplicateRecords.filter(record => record.id !== masterRecordId);
            }
        } else {
            this.duplicateRecords = event.detail.selectedRecords;
        }

        if (this.masterRecord[0]){
            this.duplicateRecords = this.duplicateRecords.filter(record => record.id !== this.masterRecord[0].id);
        }
    }

    handleColumnSelection(event) {
        // console.log('In parent', event.detail.selectedColumns);
        if (event.detail.name === "Master Record"){
            this.masterColumns  = event.detail.selectedColumns;
        } else {
            this.duplicateColumns = event.detail.selectedColumns;
        }
    }

    handleOpenCompareModal(event) {
        console.log('In parent handleOpenCompareModal :');
        this.compareDuplicateRecord = event.detail.duplicateRecord;
        this.allColumns = event.detail.allColumns;
        this.selectedColumns = [...new Set([...this.masterColumns, ...this.duplicateColumns])];
        this.showCompareModal = true;
    }

    handleRemoveRecordAction(event) {
        this.compareDuplicateRecord = event.detail.removeRecord;
        this.handleShowConfirmation();
        this.isRemoveRecordAction = true;
        // this.handleRemoveRecord(event.detail.removeRecord);
    }

    handleBack() {
        if (this.currentStep ==2) {
            this.prevStep = this.currentStep;
            this.currentStep = (parseInt(this.currentStep) - 1).toString();
        }
    }

    handleNext() {
        if (this.currentStep < 3) { 
            if (this.currentStep == 1) {
                if (this.masterRecord.length == 0){
                    this.showToast('Error', 'Please select One Master Record for Further Processing', 'error');
                } else if (this.duplicateRecords.length == 0) {
                    this.showToast('Error', 'Please select at least One Duplicate Record for Further Processing', 'error');
                } else {
                    this.prevStep = this.currentStep;
                    this.currentStep = (parseInt(this.currentStep) + 1).toString();
                }
            } else if (this.currentStep == 2) {
                //for dialog box display on clicking Proceed to merge
                if (this.duplicateRecords.length == 0){
                    this.showToast('Error', 'Please select at least One Duplicate Record for Further Processing', 'error');
                } else {
                    this.showConfirmationModal = true;
                }
            }
        }

        if (this.currentStep == 3) {
            this.prevStep = "";
            this.currentStep = (parseInt(this.currentStep) - 2).toString();
            this.duplicateRecords=[];
            this.masterRecord=[]; 
        }
    }

    handleConfirm() {
        if (this.showConfirmationModal && (this.showCompareModal || this.isRemoveRecordAction)) {
            this.handleRemoveRecord(this.compareDuplicateRecord);
            this.showConfirmationModal = false;
            this.showCompareModal = false;
        } else {
            this.handleConfirmMerge();
        }
    }

    handleCancel() {
        if (this.showConfirmationModal && (this.showCompareModal || this.isRemoveRecordAction)) {
            this.showConfirmationModal = false;
        } else {
            this.handleCancelMerge();
        }
    }

    //for dialog box display on clicking Proceed to merge
    handleConfirmMerge() {
        this.showConfirmationModal = false;
        this.prevStep = this.currentStep;
        this.currentStep = (parseInt(this.currentStep) + 1).toString();
        this.performMergeAndArchive();
    }

    //for dialog box display on clicking Proceed to merge
    handleCancelMerge() {
        this.showConfirmationModal = false;
    }

    // to remove record from selected duplicate records
    handleRemoveRecord(removeRecord) {
        const filteredRecords = this.duplicateRecords.filter(record => record.id !== removeRecord.id);
        this.duplicateRecords = [...filteredRecords];
        this.isRemoveRecordAction = false;
    }

    //to close compare records Modal
    handleCloseModal() {
        this.showCompareModal = false;
    }

    //to show confirmation modal for remove record action
    handleShowConfirmation() {
        this.showConfirmationModal = true;
    }

    @api
    async performMergeAndArchive() {
        this.isLoading = true;
        try {
            const masterId = this.masterRecord[0].id;
            const duplicateIds = this.duplicateRecords.map(record => record.id);
            const result = await mergeAndArchiveDuplicates({ masterId: masterId, duplicateIds: duplicateIds });
        } catch (error) {
            console.error('Error while merging:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    //Added for displaying Toast message when no master or duplicate records are selected
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(event);
    }

    get stepTitle() {
        switch (this.currentStep) {
            case "1":
                return "Select Master and Duplicate Records";
            case "2":
                return "Review Master and Duplicate Records";
            case "3":
                return "Results";
        }
    }

    get masterRecordName(){
        return "Master Record";
    }

    get duplicateRecordsName(){
        return "Duplicate Records";
    }

    get isStep1(){
        return this.currentStep === "1" ? true : false;
    }

    get isStep2(){
        return this.currentStep === "2" ? true : false;
    }

    get isStep3(){
        return this.currentStep === "3" ? true : false;
    }

    get isFirstStep(){
        return this.currentStep === "1" ? true : false;
    }

    get isLastStep(){
        return this.currentStep === "3" ? true : false;
    }

    get hideChecboxColumn(){
        return true;
    }

    get nextBtnText(){
        switch (this.currentStep) {
            case "1":
                return "Review";
            case "2":
                return "Proceed To Merge";
            case "3":
                return "Start Over";
        }
    }

    get backBtnText(){
        switch (this.currentStep) {
            case "1":
                return "Back";
            case "2":
                return "Edit Selection";
            case "3":
                return "Back";
        }
    }
    
    get isButtonDisabled() {
        return this.currentStep === "1" || this.currentStep === "3";
    }

    get confirmationModalTitle() {
        if (this.showConfirmationModal && (this.showCompareModal || this.isRemoveRecordAction)) {
            return "Remove Record Confirmation"
        } else {
            return "Merge Confirmation"
        }
    }

    get confirmationModalDescription() {
        if (this.showConfirmationModal && (this.showCompareModal || this.isRemoveRecordAction)) {
            return "Are you sure you want to remove the record?"
        } else {
            return "Are you sure you want to confirm the merge?"
        }
    }
 }

