import { LightningElement, api } from 'lwc';

export default class ConfirmationModal extends LightningElement {
    @api showModal = false;

    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }

    handleConfirm() {
        this.dispatchEvent(new CustomEvent('confirm'));
    }
}