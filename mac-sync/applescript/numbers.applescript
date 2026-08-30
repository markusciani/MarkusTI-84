on openDocument(documentPath)
	set targetFile to POSIX file documentPath
	tell application "Numbers"
		activate
		return open targetFile
	end tell
end openDocument

on getSheet(targetDocument, sheetName)
	tell application "Numbers"
		tell targetDocument
			if not (exists sheet sheetName) then error "Missing Numbers sheet: " & sheetName
			return sheet sheetName
		end tell
	end tell
end getSheet

on getTable(targetSheet, tableName)
	tell application "Numbers"
		tell targetSheet
			if not (exists table tableName) then error "Missing Numbers table: " & tableName
			return table tableName
		end tell
	end tell
end getTable

on findColumnByHeader(targetTable, headerName)
	tell application "Numbers"
		tell targetTable
			if header row count is 0 then error "Table has no header row"
			repeat with columnIndex from 1 to column count
				set headerValue to value of cell columnIndex of row 1
				if (headerValue as text) is headerName then return columnIndex
			end repeat
		end tell
	end tell
	error "Missing Numbers column: " & headerName
end findColumnByHeader

on findTicket(targetTable, ticketColumnIndex, ticketId)
	tell application "Numbers"
		tell targetTable
			repeat with rowIndex from 2 to row count
				set currentValue to value of cell ticketColumnIndex of row rowIndex
				if currentValue is not missing value and (currentValue as text) is ticketId then return rowIndex
			end repeat
		end tell
	end tell
	return 0
end findTicket

on emptyTicketRow(targetTable, ticketColumnIndex)
	tell application "Numbers"
		tell targetTable
			repeat with rowIndex from 2 to row count
				set currentValue to value of cell ticketColumnIndex of row rowIndex
				if currentValue is missing value or (currentValue as text) is "" then return rowIndex
			end repeat
			add row below last row
			return row count
		end tell
	end tell
end emptyTicketRow

on appendTicket(targetTable, ticketId, fieldArguments)
	set ticketColumnIndex to my findColumnByHeader(targetTable, "Ticket ID")
	if my findTicket(targetTable, ticketColumnIndex, ticketId) is not 0 then return "EXISTS"
	set targetRowIndex to my emptyTicketRow(targetTable, ticketColumnIndex)
	repeat with argumentIndex from 1 to count of fieldArguments by 2
		set headerName to item argumentIndex of fieldArguments
		set fieldValue to item (argumentIndex + 1) of fieldArguments
		set columnIndex to my findColumnByHeader(targetTable, headerName)
		tell application "Numbers" to tell targetTable to set value of cell columnIndex of row targetRowIndex to fieldValue
	end repeat
	return "CREATED"
end appendTicket

on run argv
	if (count of argv) < 6 then error "Expected document path, sheet, table, ticket ID, and field pairs"
	set documentPath to item 1 of argv
	set sheetName to item 2 of argv
	set tableName to item 3 of argv
	set ticketId to item 4 of argv
	set fieldArguments to items 5 thru -1 of argv
	if (count of fieldArguments) mod 2 is not 0 then error "Field arguments must be header/value pairs"
	set targetDocument to my openDocument(documentPath)
	set targetSheet to my getSheet(targetDocument, sheetName)
	set targetTable to my getTable(targetSheet, tableName)
	set resultValue to my appendTicket(targetTable, ticketId, fieldArguments)
	tell application "Numbers" to save targetDocument
	return resultValue
end run
