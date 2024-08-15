import { LightningElement, api, track } from 'lwc';

export default class CompareModal extends LightningElement {
    @api masterRecord;
    @api duplicateRecord;
    @api allFields = [];
    @api selectedFields = [];
    
    @track comparisonData = [];
    @track fieldOptions = [];

    @track comparisonColumns = [
        { label: 'Field', fieldName: 'field', type: 'text', wrapText: true },
        { label: 'Master Record', fieldName: 'masterValue', type: 'text', wrapText: true },
        { label: 'Duplicate Record', fieldName: 'duplicateValue', type: 'text', wrapText: true }
    ];

    connectedCallback() {
        this.masterRecord = this.masterRecord[0];
        this.initializeComparisonData();
        this.initializeFieldOptions();
        console.log('selectedField', this.selectedFields);
    }

    // Prepare table data with field labels
    initializeComparisonData() {
        this.comparisonData = Array.from(this.selectedFields).map(field => {
            const fieldLabel = this.getFieldLabel(field);
            return {
                id: field,
                field: fieldLabel,
                masterValue: field === 'nameurl' ? this.masterRecord['name'] : this.masterRecord[field] || ' - ',
                duplicateValue: field === 'nameurl' ? this.duplicateRecord['name'] : this.duplicateRecord[field] || ' - '
            };
        });
        console.log('comparisonData', this.comparisonData);
    }

    // Prepare field options for dual listbox
    initializeFieldOptions() {
        this.fieldOptions = this.allFields.map(item => ({
            label: item.label,
            value: item.fieldName
        }));
    }

    handleFieldSelection(event) {
        this.selectedFields = event.detail.value;
        this.initializeComparisonData();
    }

    // Helper method to get field label from field name
    getFieldLabel(fieldName) {
        const field = this.allFields.find(item => item.fieldName === fieldName);
        return field ? field.label : fieldName;
    }

    acceptChanges() {
        // Close the modal and navigate back to page 2
        this.dispatchEvent(new CustomEvent('close'));
    }

    // Remove record from selected duplicate records 
    confirmRemoveRecord() {
        this.dispatchEvent(new CustomEvent('showconfirmation'));
    }
}
