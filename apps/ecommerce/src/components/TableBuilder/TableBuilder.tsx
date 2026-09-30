'use client';
import { Card, CardContent, CardDescription, CardHeader } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";


interface ColumnConfig {
    key: string;
    header: string;
    className?: string;
    render?: (value: any, row: any) => React.ReactNode;
    hidden?: 'sm' | 'md' | 'lg' | boolean;
}

interface TableBuilderProps {
    data: any[];
    columns: ColumnConfig[];
    title?: string;
    description?: string;
    emptyMessage?: string;
}

export default function TableBuilder({ data, columns, description }: TableBuilderProps) {
    const getVisibilityClass = (hidden?: 'sm' | 'md' | 'lg' | boolean) => {
        if (hidden === true) return 'hidden';
        if (hidden === 'sm') return 'hidden sm:table-cell';
        if (hidden === 'md') return 'hidden md:table-cell';
        if (hidden === 'lg') return 'hidden lg:table-cell';
        return '';
    };
    
    return (
        <Card className="dark:border-gray-700">
            <CardHeader className="px-7">
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="dark:border-gray-700">
                            {columns.map((column) => (
                                <TableHead key={column.key} className={`${column.className || ''} ${getVisibilityClass(column.hidden)}`}>
                                    {column.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row, rowIndex) => (
                            <TableRow className={`dark:border-gray-700 transition-opacity duration-300 ${('active' in row && !row.active) && 'opacity-40'}`} key={rowIndex}>
                                {columns.map((column) => {
                                    const cellContent = column.render ? column.render(row[column.key], row) : row[column.key];
                                    return (
                                        <TableCell key={`${rowIndex}-${column.key}`} className={`${column.className || ''} ${getVisibilityClass(column.hidden)}`}>
                                            {cellContent}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
