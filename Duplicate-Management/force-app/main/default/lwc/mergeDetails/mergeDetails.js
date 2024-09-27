import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class MergeDetails extends LightningElement {
    @api mergeName = '';
    @api mergeDescription = '';

    handleNameChange(event) {
        this.mergeName = event.target.value;
    }

    handleDescriptionChange(event) {
        this.mergeDescription = event.target.value;
    }

    handleCancel() {
        // Navigate back to the home page
        this.dispatchEvent(new CustomEvent('backtohome'));
    }

    handleSave() {
        if (!this.mergeName){
            this.showToast('Error', 'Please give a name for the new merge operation!', 'error');
        } else {
            // Dispatch event to navigate to Step 1 of the merge operation
            this.dispatchEvent(new CustomEvent('startmerge', {
                detail: {
                    name: this.mergeName,
                    description: this.mergeDescription
                }
            }));
        }
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(event);
    }
}