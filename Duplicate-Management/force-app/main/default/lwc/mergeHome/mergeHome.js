import { LightningElement, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import getMergeHistoryRecords from '@salesforce/apex/AccountMergeHistoryController.getMergeHistoryRecords';

const PAGE_SIZE = 5;
const columns = [
    {
        type: 'button',
        typeAttributes: {
            label: 'View',
            name: 'view_record',
            title: 'View Record',
            variant: 'base',
        },
        sortable: false
    },
    { label: 'Name', fieldName: 'name', type: 'text',sortable: true},
    { label: 'Description', fieldName: 'description', type: 'text',sortable: true },
    // { label: 'Master Account', fieldName: 'masterAccountName', type: 'text' },
    // { label: 'Merged Accounts', fieldName: 'mergedAccounts', type: 'text' },
    {
        label: 'Number of Duplicate Records',
        fieldName: 'noOfDuplicateRecords',
        type: 'number',
        cellAttributes: {
            alignment: 'left'
        },
        sortable: true
    },
    { label: 'Start Time', fieldName: 'startTime', type: 'datetime' ,sortable: true},
    //{ label: 'End Time', fieldName: 'endTime', type: 'datetime' },
    { label: 'Status', fieldName: 'status', type: 'text' ,sortable: true}    
];

export default class MergeHome extends NavigationMixin(LightningElement) {
    @track showWelcome = true;
    @track showMergeDetails = false;
    @track showMergeDuplicates = false;
    @track mergeHistoryData = [];
    @track mergeName = '';
    @track mergeDescription = '';

    @track sortBy;
    @track sortDirection;

    columns = columns;
    totalRecords = 0;
    pageNumber = 1;
    totalPages = 0;
    wiredMergeHistoryResult;

    @wire(getMergeHistoryRecords, { pageNumber: '$pageNumber', pageSize: PAGE_SIZE })
    wiredMergeHistory(result) {
        this.wiredMergeHistoryResult = result;
        const { data, error } = result;
        if (data) {
            this.mergeHistoryData = data.records.map(record => ({
                id: record.Id,
                name: record.Name__c,
                description: record.Description__c,
                masterAccountName: record.Master_Account__r.Name,
                mergedAccounts: record.Merged_Accounts__c,
                noOfDuplicateRecords: record.No_of_Duplicate_Records__c,
                status: record.Status__c,
                startTime: this.formatDateTime(record.Start_Time__c),
                endTime: this.formatDateTime(record.End_Time__c),
            }));
            this.totalRecords = data.totalRecords;
            this.totalPages = Math.ceil(this.totalRecords / PAGE_SIZE);
        } else if (error) {
            console.error('Error fetching merge history:', error);
        }
    }

    renderedCallback() {
        refreshApex(this.wiredMergeHistoryResult);
    }

    handlePreviousPage() {
        if (this.pageNumber > 1) {
            this.pageNumber--;
        }
    }

    handleNextPage() {
        if (this.pageNumber < this.totalPages) {
            this.pageNumber++;
        }
    }

    get isFirstPage() {
        return this.pageNumber === 1;
    }

    get isLastPage() {
        return this.pageNumber === this.totalPages || this.totalPages === 0;
    }

    get pageInfo() {
        return `Page ${this.pageNumber} of ${this.totalPages}`;
    }

    get displayHistoryTable() {
        return this.mergeHistoryData.length ? true : false;
    }


    handleSort(event) {
        this.sortBy = event.detail.fieldName;
        this.sortDirection = event.detail.sortDirection;
        this.sortData(this.sortBy, this.sortDirection);
    }
    
    sortData(fieldname, direction) {
        let parseData = JSON.parse(JSON.stringify(this.mergeHistoryData));
        let keyValue = (a) => {
            return a[fieldname];
        };
        let isReverse = direction === 'asc' ? 1: -1;
        parseData.sort((x, y) => {
            x = keyValue(x) ? keyValue(x) : ''; // handling null values
            y = keyValue(y) ? keyValue(y) : '';
            // sorting values based on direction
            return isReverse * ((x > y) - (y > x));
        });
        this.mergeHistoryData = parseData;
    }

    // For formatting date time
    formatDateTime(dateTimeString) {
        if (!dateTimeString) return '';
        const date = new Date(dateTimeString);
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour12: true
        }).format(date);
    }

    handleRowAction(event) {
        const action = event.detail.action;
        const row = event.detail.row;
        if (action.name === 'view_record') {
            // Generate the URL for the record page
            this[NavigationMixin.GenerateUrl]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: row.id,
                    objectApiName: 'Account_Merge_History__c',
                    actionName: 'view'
                }
            }).then(url => {
                // Open the URL in a new tab
                window.open(url, '_blank');
            }).catch(error => {
                console.error('Error generating URL', error);
            });
        }
    }

    handleStartMerge() {
        this.mergeName = '';
        this.mergeDescription = '';
        this.showWelcome = false;
        this.showMergeDetails = true;
    }

    handleProceedToStep1(event) {
        const { name, description } = event.detail;
        console.log('Merge Operation Name:', name);
        console.log('Merge Operation Description:', description ? description : '');
        this.mergeName = name;
        this.mergeDescription = description ? description : '';
        this.showMergeDetails = false;
        this.showMergeDuplicates = true;
    }

    handleBackToHome() {
        this.showWelcome = true;
        this.showMergeDetails = false;
        this.showMergeDuplicates = false;
    }

    handleBackToDetails() {
        this.showWelcome = false;
        this.showMergeDetails = true;
        this.showMergeDuplicates = false;
    }

    handleStartNewMerge() {
        this.showMergeDuplicates = false;
        this.showMergeDetails = true;
    }
}