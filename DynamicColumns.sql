DECLARE
	   @ls INT,
	   @st INT,
	   @Columnsold NVARCHAR(MAX),
	   @d1 VARCHAR(MAX),  
	   @d2 VARCHAR(MAX);


	SET @ls = 3;  
	SET @st = 1;  
	SET @Columnsold = NULL;  

	-- Columns for OLD table (Previous 6 months)
	WHILE @st <= @ls
	BEGIN
		-- Generate dynamic column names for WS and CS
		SET @d1 = CONCAT(LEFT(DATENAME(MONTH, DATEADD(MONTH, -@st, GETDATE())), 3), '_', RIGHT(YEAR(DATEADD(MONTH, -@st, GETDATE())), 2), '_WS');
		SET @d2 = CONCAT(LEFT(DATENAME(MONTH, DATEADD(MONTH, -@st, GETDATE())), 3), '_', RIGHT(YEAR(DATEADD(MONTH, -@st, GETDATE())), 2), '_CS');

		-- Concatenate the generated columns to @Columnsold variable
		SET @Columnsold = COALESCE(@Columnsold + ', ', '') + QUOTENAME(@d1) + ', ' + QUOTENAME(@d2);

		-- Increment the month counter
		SET @st = @st + 1;
	END;

	-- Output the generated column list
	Print @Columnsold;