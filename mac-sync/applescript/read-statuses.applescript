on findColumnByHeader(targetTable, headerName)
	tell application "Numbers"
		tell targetTable
			if header row count is 0 then error "Table has no header row"
			repeat with columnIndex from 1 to column count
				set headerValue to value of cell columnIndex of row 1
				if headerValue is not missing value and (headerValue as text) is headerName then return columnIndex
			end repeat
		end tell
	end tell
	error "Missing Numbers column: " & headerName
end findColumnByHeader

on run argv
	if (count of argv) is not 3 then error "Expected document path, sheet, and table"
	set documentPath to item 1 of argv
	set sheetName to item 2 of argv
	set tableName to item 3 of argv
	set targetFile to POSIX file documentPath
	tell application "Numbers"
		set targetDocument to open targetFile
		tell targetDocument
			if not (exists sheet sheetName) then error "Missing Numbers sheet: " & sheetName
			set targetSheet to sheet sheetName
		end tell
		tell targetSheet
			if not (exists table tableName) then error "Missing Numbers table: " & tableName
			set targetTable to table tableName
		end tell
	end tell
	set ticketColumn to my findColumnByHeader(targetTable, "Ticket ID")
	set statusColumn to my findColumnByHeader(targetTable, "Status")
	set outputLines to {}
	tell application "Numbers"
		tell targetTable
			repeat with rowIndex from 2 to row count
				set ticketValue to value of cell ticketColumn of row rowIndex
				set statusValue to value of cell statusColumn of row rowIndex
				if ticketValue is not missing value and (ticketValue as text) is not "" and statusValue is not missing value then
					set end of outputLines to (ticketValue as text) & tab & (statusValue as text)
				end if
			end repeat
		end tell
	end tell
	set AppleScript's text item delimiters to linefeed
	set outputText to outputLines as text
	set AppleScript's text item delimiters to ""
	return outputText
end run
