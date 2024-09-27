/**
 * @description       : 
 * @author            : mohammedhafiz.shahulhameed@cat.com
 * @group             : 
 * @last modified on  : 08-18-2024
 * @last modified by  : mohammedhafiz.shahulhameed@cat.com
**/
public with sharing class AccountMergeHistoryController {
    @AuraEnabled(cacheable=true)
    public static PaginatedResult getMergeHistoryRecords(Integer pageNumber, Integer pageSize) {
        Integer offset = (pageNumber - 1) * pageSize;
        
        List<Account_Merge_History__c> records = [
            SELECT  Id, 
                    Master_Account__r.Name, 
                    Merged_Accounts__c,
                    No_of_Duplicate_Records__c,
                    Name__c,
                    Description__c,
                    Merge_Date_Time__c, 
                    Start_Time__c, 
                    End_Time__c, 
                    Status__c, 
                    Response__c
            FROM Account_Merge_History__c 
            ORDER BY Merge_Date_Time__c DESC 
            LIMIT :pageSize
            OFFSET :offset
        ];
        
        Integer totalRecords = [SELECT COUNT() FROM Account_Merge_History__c];
        
        return new PaginatedResult(records, totalRecords);
    }
    
    public class PaginatedResult {
        @AuraEnabled public List<Account_Merge_History__c> records;
        @AuraEnabled public Integer totalRecords;
        
        public PaginatedResult(List<Account_Merge_History__c> records, Integer totalRecords) {
            this.records = records;
            this.totalRecords = totalRecords;
        }
    }
}