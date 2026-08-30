on findColumnByHeader(targetTable, headerName)
	tell application "Numbers"
		tell targetTable
			if header row count is 0 then return 0
			repeat with columnIndex from 1 to column count
				set headerValue to value of cell columnIndex of row 1
				if headerValue is not missing value and (headerValue as text) is headerName then return columnIndex
			end repeat
		end tell
	end tell
	return 0
end findColumnByHeader

on clearTicket(targetTable, ticketId)
	set ticketColumn to my findColumnByHeader(targetTable, "Ticket ID")
	if ticketColumn is 0 then return false
	tell application "Numbers"
		tell targetTable
			repeat with rowIndex from 2 to row count
				set currentValue to value of cell ticketColumn of row rowIndex
				if currentValue is not missing value and (currentValue as text) is ticketId then
					repeat with columnIndex from 1 to column count
						set value of cell columnIndex of row rowIndex to missing value
					end repeat
					return true
				end if
			end repeat
		end tell
	end tell
	return false
end clearTicket

on run argv
	if (count of argv) < 4 then error "Expected document path, sheet, table, and ticket IDs"
	set documentPath to item 1 of argv
	set sheetName to item 2 of argv
	set tableName to item 3 of argv
	set ticketIds to items 4 thru -1 of argv
	set targetFile to POSIX file documentPath
	tell application "Numbers"
		set targetDocument to open targetFile
		tell targetDocument
			if not (exists sheet sheetName) then return 0
			set targetSheet to sheet sheetName
		end tell
		tell targetSheet
			if not (exists table tableName) then return 0
			set targetTable to table tableName
		end tell
	end tell
	set clearedCount to 0
	repeat with ticketId in ticketIds
		if my clearTicket(targetTable, ticketId as text) then set clearedCount to clearedCount + 1
	end repeat
	tell application "Numbers" to save targetDocument
	return clearedCount
end run
