import { LightningElement, api, track } from 'lwc';

export default class ResultantTable extends LightningElement {
    @api masterRecord;
    @api duplicateRecords;
    
    @track comparisonData = [];

    connectedCallback() {
        this.prepareComparisonData();
    }

    prepareComparisonData() {
        if (this.masterRecord && this.duplicateRecords) {
            this.comparisonData = this.duplicateRecords.map((duplicate, index) => ({
                rowNumber: index + 1,
                masterId: this.masterRecord[0].id,
                masterName: this.masterRecord[0].name,
                duplicateId: duplicate.id,
                duplicateName: duplicate.name
            }));
        }
    }

    get mergedRecordsCount() {
        return this.duplicateRecords ? this.duplicateRecords.length : 0;
    }
}