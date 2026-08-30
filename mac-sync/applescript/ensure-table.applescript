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

on run argv
	if (count of argv) < 5 then error "Expected document path, sheet, table, reuse-default flag, and headers"
	set documentPath to item 1 of argv
	set sheetName to item 2 of argv
	set tableName to item 3 of argv
	set reuseDefault to item 4 of argv is "true"
	set headerNames to items 5 thru -1 of argv
	set targetFile to POSIX file documentPath

	tell application "System Events" to set fileExists to exists disk item documentPath
	tell application "Numbers"
		activate
		if fileExists then
			set targetDocument to open targetFile
		else
			set targetDocument to make new document
			save targetDocument in targetFile
		end if

		tell targetDocument
			set createdSheet to false
			if not (exists sheet sheetName) then
				if reuseDefault and (count of sheets) is 1 then
					set name of sheet 1 to sheetName
					set targetSheet to sheet sheetName
					set createdSheet to true
				else
					set targetSheet to make new sheet with properties {name:sheetName}
					set createdSheet to true
				end if
			else
				set targetSheet to sheet sheetName
			end if
		end tell

		tell targetSheet
			set createdTable to false
			if not (exists table tableName) then
				if createdSheet and (count of tables) is 1 then
					set name of table 1 to tableName
					set targetTable to table tableName
				else
					set targetTable to make new table with properties {name:tableName}
				end if
				set createdTable to true
			else
				set targetTable to table tableName
			end if
		end tell

		tell targetTable
			set header row count to 1
			if createdTable then
				repeat while column count < (count of headerNames)
					add column after last column
				end repeat
				repeat with columnIndex from 1 to count of headerNames
					set value of cell columnIndex of row 1 to item columnIndex of headerNames
				end repeat
			else
				repeat with headerName in headerNames
					if my findColumnByHeader(targetTable, headerName as text) is 0 then
						add column after last column
						set value of cell (column count) of row 1 to headerName as text
					end if
				end repeat
			end if
		end tell
		save targetDocument
	end tell
end run
