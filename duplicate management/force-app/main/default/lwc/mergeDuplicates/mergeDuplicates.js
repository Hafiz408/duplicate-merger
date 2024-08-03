import { api, LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import mergeAndArchiveDuplicates from '@salesforce/apex/MergeAndArchiveController.mergeAndArchiveDuplicates';

export default class MergeDuplicates extends LightningElement {
    currentStep = "1";
    prevStep;
    @api masterRecord = [];
    @api duplicateRecords = [];
    @track isLoading = false;
    @track showConfirmationModal = false;

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

    handleBack() {
        if (this.currentStep ==2) {
            this.prevStep = this.currentStep;
            this.currentStep = (parseInt(this.currentStep) - 1).toString();
        }
    }

    handleNext() {
        if (this.currentStep < 3) { 
            if (this.currentStep == 1 && this.masterRecord.length == 0) {
                this.showToast('Error', 'Please select One Master Record for Further Processing', 'error');
            } else if (this.currentStep == 1 && this.duplicateRecords.length == 0) {
                this.showToast('Error', 'Please select at least One Duplicate Record for Further Processing', 'error');
            } else if (this.currentStep == 2) {
                //for dialog box display on clicking Proceed to merge
                this.showConfirmationModal = true;
            } else {
                this.prevStep = this.currentStep;
                this.currentStep = (parseInt(this.currentStep) + 1).toString();
            }
        }

        if (this.currentStep == 3) {
            this.prevStep = "";
            this.currentStep = (parseInt(this.currentStep) - 2).toString();
            this.duplicateRecords=[];
            this.masterRecord=[];
            
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

    //Added for displaying Toast message when no master or duplicate records are selected
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(event);
    }


    handleRecordSelection(event) {
        console.log('In parent', event.detail.selectedRecords);
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

    @api
    async performMergeAndArchive() {
        this.isLoading = true;
        try {
            const masterId = this.masterRecord[0].id;
            const duplicateIds = this.duplicateRecords.map(record => record.id);
            const result = await mergeAndArchiveDuplicates({ masterId: masterId, duplicateIds: duplicateIds });
        } catch (error) {
            console.log('Error while merging!!');
        } finally {
            this.isLoading = false;
        }
    }
}

