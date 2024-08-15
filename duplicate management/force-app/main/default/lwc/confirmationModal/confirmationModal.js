import { LightningElement, api } from 'lwc';

export default class ConfirmationModal extends LightningElement {
    @api showModal = false;
    @api title = "";
    @api description = "";

    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }

    handleConfirm() {
        this.dispatchEvent(new CustomEvent('confirm'));
    }
}