public with sharing class MergeAndArchiveController {
    
    @AuraEnabled
    public static String mergeAndArchiveDuplicates(Id masterId, List<Id> duplicateIds) {
        try {
            // Get all updateable fields for Account object
            Map<String, Schema.SObjectField> fieldMap = Schema.SObjectType.Account.fields.getMap();
            List<String> updateableFields = new List<String>();
            for (String fieldName : fieldMap.keySet()) {
                Schema.DescribeFieldResult fieldDescribe = fieldMap.get(fieldName).getDescribe();
                if (fieldDescribe.isUpdateable()) {
                    updateableFields.add(fieldName);
                }
            }
            
            // Construct dynamic query for master and duplicate records
            String queryFields = String.join(updateableFields, ', ');
            String masterQuery = 'SELECT ' + queryFields + ' FROM Account WHERE Id = :masterId LIMIT 1';
            String duplicateQuery = 'SELECT ' + queryFields + ' FROM Account WHERE Id IN :duplicateIds';
            
            // Fetch the master record
            Account masterRecord = Database.query(masterQuery);
            
            // Fetch the duplicate records
            List<Account> duplicateRecords = Database.query(duplicateQuery);
            
            // Merge fields from duplicate records to master record
            for (Account duplicate : duplicateRecords) {
                for (String field : updateableFields) {
                    if (masterRecord.get(field) == null && duplicate.get(field) != null) {
                        masterRecord.put(field, duplicate.get(field));
                    }
                }
            }
            
            // Update the master record
            update masterRecord;
            
            // Link related objects to master account and mark duplicates as archived
            linkRelatedObjects(masterRecord.Id, duplicateIds);
            
            // Mark duplicate records as archived
            for (Account duplicate : duplicateRecords) {
                duplicate.isArchive__c = true;
            }
            update duplicateRecords;
            
            return 'Merge completed, related objects linked, and duplicates archived successfully';
        } catch (Exception e) {
            throw new AuraHandledException('Error during merge and archive: ' + e.getMessage());
        }
    }
    
    private static void linkRelatedObjects(Id masterId, List<Id> duplicateIds) {
        // Link Contacts
        List<Contact> contactsToUpdate = [SELECT Id, AccountId FROM Contact WHERE AccountId IN :duplicateIds];
        for (Contact c : contactsToUpdate) {
            c.AccountId = masterId;
        }
        update contactsToUpdate;
        
        // Link Opportunities
        List<Opportunity> opportunitiesToUpdate = [SELECT Id, AccountId FROM Opportunity WHERE AccountId IN :duplicateIds];
        for (Opportunity opp : opportunitiesToUpdate) {
            opp.AccountId = masterId;
        }
        update opportunitiesToUpdate;
        
        // Link Cases
        List<Case> casesToUpdate = [SELECT Id, AccountId FROM Case WHERE AccountId IN :duplicateIds];
        for (Case cs : casesToUpdate) {
            cs.AccountId = masterId;
        }
        update casesToUpdate;
    }
}
