import { api, LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import mergeAndArchiveDuplicates from '@salesforce/apex/MergeAndArchiveController.mergeAndArchiveDuplicates';
import sendMergeRequest from '@salesforce/apex/HerokuApiIntegration.sendMergeRequest';

export default class MergeDuplicates extends LightningElement {
    currentStep = "1";
    prevStep;

    @api mergeName = '';
    @api mergeDescription = '';

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
        if (event.detail.name === "Master Record") {
            this.masterRecord = event.detail.selectedRecords;
            if (this.masterRecord.length > 0) {
                const masterRecordId = this.masterRecord[0].id; // Get the ID of the selected master record
                this.duplicateRecords = this.duplicateRecords.filter(record => record.id !== masterRecordId);
            }
        } else {
            this.duplicateRecords = event.detail.selectedRecords;
        }

        if (this.masterRecord[0]) {
            this.duplicateRecords = this.duplicateRecords.filter(record => record.id !== this.masterRecord[0].id);
        }
    }

    handleColumnSelection(event) {
        // console.log('In parent', event.detail.selectedColumns);
        if (event.detail.name === "Master Record") {
            this.masterColumns = event.detail.selectedColumns;
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
        if (this.currentStep == 2) {
            this.prevStep = this.currentStep;
            this.currentStep = (parseInt(this.currentStep) - 1).toString();
        }
        // Navigating from mergeDuplicates page to home page
        if (this.currentStep == 1) {
            this.handleBackToDetails();
        } else if (this.currentStep == 3) {
            this.handleBackToHome();
        }
    }

    //Navigating from mergeDuplicates page to home page
    handleBackToHome() {
        // Dispatch a custom event which will be catched by mergeHome
        this.dispatchEvent(new CustomEvent('backtohome'));
    }

    //Navigating from mergeDuplicates page to merge details page
    handleBackToDetails() {
        // Dispatch a custom event which will be catched by mergeHome
        this.dispatchEvent(new CustomEvent('backtodetails'));
    }


    handleNext() {
        if (this.currentStep < 3) {
            if (this.currentStep == 1) {
                if (this.masterRecord.length == 0) {
                    this.showToast('Error', 'Please select One Master Record for Further Processing', 'error');
                } else if (this.duplicateRecords.length == 0) {
                    this.showToast('Error', 'Please select at least One Duplicate Record for Further Processing', 'error');
                } else {
                    this.prevStep = this.currentStep;
                    this.currentStep = (parseInt(this.currentStep) + 1).toString();
                }
            } else if (this.currentStep == 2) {
                //for dialog box display on clicking Proceed to merge
                if (this.duplicateRecords.length == 0) {
                    this.showToast('Error', 'Please select at least One Duplicate Record for Further Processing', 'error');
                } else {
                    this.showConfirmationModal = true;
                }
            }
        }
        else if (this.currentStep == 3) {
            // Dispatch an event to navigate to the MergeDetails page
            this.dispatchEvent(new CustomEvent('startnewmerge'));

            // if (this.currentStep == 3) {
            //     this.prevStep = "";
            //     this.currentStep = (parseInt(this.currentStep) - 2).toString();
            //     this.duplicateRecords=[];
            //     this.masterRecord=[]; 
            // }
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
            const result = await mergeAndArchiveDuplicates({ masterId: masterId, duplicateIds: duplicateIds, name: this.mergeName, description: this.mergeDescription });
            console.log('Merge result:', result);
            
            // // commence merge through api
            // sendMergeRequest({ survivorId: this.survivorId, collapsedIds: this.collapsedIds})
            // .then(response => {
            //     this.createMergeHistoryRecord(this.survivorId, this.collapsedIds, this.mergeName, this.mergeDescription, response);

            //     const result = JSON.parse(response);
            //     const statusCode = result.statusCode;
            //     const responseBody = result.body;

            //     if (statusCode === 200 || statusCode === 201) {
            //         console.log('Merge request successful:', responseBody);
            //     } else {
            //         console.error('Merge failed with status:', statusCode, 'and response:', response);
            //     }
            // })
            // .catch(error => {
            //     console.error('Error in merge request:', error);
            // });

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

    get masterRecordName() {
        return "Master Record";
    }

    get duplicateRecordsName() {
        return "Duplicate Records";
    }

    get isStep1() {
        return this.currentStep === "1" ? true : false;
    }

    get isStep2() {
        return this.currentStep === "2" ? true : false;
    }

    get isStep3() {
        return this.currentStep === "3" ? true : false;
    }

    get isFirstStep() {
        return this.currentStep === "1" ? true : false;
    }

    get isLastStep() {
        return this.currentStep === "3" ? true : false;
    }

    get hideChecboxColumn() {
        return true;
    }

    get nextBtnText() {
        switch (this.currentStep) {
            case "1":
                return "Review";
            case "2":
                return "Proceed To Merge";
            case "3":
                return "Start New Merge";
        }
    }

    get backBtnText() {
        switch (this.currentStep) {
            case "1":
                return "Back";
            case "2":
                return "Edit Selection";
            case "3":
                return "Go back to home page";
        }
    }
    get isButtonDisabled() {
        // Kee - return  this.currentStep === "3";
        return false;
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
            return "Are you sure you want to remove the record from duplicate records?"
        } else {
            return "Are you sure you want to confirm the merge?"
        }
    }
}