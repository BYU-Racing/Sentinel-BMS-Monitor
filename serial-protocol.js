const MODULE_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function normalizeLine(line) {
    return String(line || '').trim().replace(/^-\s*/, '');
}

function parseReadingLine(line) {
    const normalizedLine = normalizeLine(line);
    const match = normalizedLine.match(
        /^module\s+(\d+)\s+(cells\[mV\]|temp\[C\])\s+min=(-?\d+(?:\.\d+)?)\s+max=(-?\d+(?:\.\d+)?)\s+avg=(-?\d+(?:\.\d+)?)(?:\s+(.*))?$/i
    );
    if (!match) {
        return null;
    }

    const [, moduleId, readingType, minValue, maxValue, avgValue, remainder = ''] = match;
    const values = [];
    const valuePattern = /([CT])(\d+):\s*(-?\d+(?:\.\d+)?)/g;
    let valueMatch;

    while ((valueMatch = valuePattern.exec(remainder)) !== null) {
        values.push({
            prefix: valueMatch[1].toUpperCase(),
            index: Number(valueMatch[2]),
            value: Number(valueMatch[3])
        });
    }

    return {
        type: 'module-reading',
        payload: {
            moduleId,
            readingType: readingType.toLowerCase(),
            min: Number(minValue),
            max: Number(maxValue),
            avg: Number(avgValue),
            values
        }
    };
}

function parseStatusLine(line) {
    const normalizedLine = normalizeLine(line);
    const match = normalizedLine.match(/^status\s+(BMS|board|voltage|temp):\s*([A-Z_]+)$/i);
    if (!match) {
        return null;
    }

    return {
        type: 'status-update',
        payload: {
            target: match[1].toLowerCase(),
            value: match[2].toUpperCase()
        }
    };
}

function parseBalancingLine(line) {
    const normalizedLine = normalizeLine(line);
    if (!normalizedLine.startsWith('balancing ')) {
        return null;
    }

    if (normalizedLine === 'balancing off') {
        return {
            type: 'balancing-update',
            payload: {
                enabled: false,
                activeCells: []
            }
        };
    }

    const activeCells = [];
    const pairPattern = /(\d+)-(\d+)/g;
    let match;

    while ((match = pairPattern.exec(normalizedLine)) !== null) {
        activeCells.push(`${Number(match[1])}-${Number(match[2])}`);
    }

    return {
        type: 'balancing-update',
        payload: {
            enabled: activeCells.length > 0,
            activeCells
        }
    };
}

function parseModuleSiliconIdsLine(line) {
    const normalizedLine = normalizeLine(line);
    const match = normalizedLine.match(/^module\s+silicon\s+ids:\s*(.*)$/i);
    if (!match) {
        return null;
    }

    const rawIds = match[1]
        .trim()
        .split(/\s+/)
        .slice(0, MODULE_IDS.length);

    return {
        type: 'module-silicon-ids',
        payload: MODULE_IDS.map((moduleId, index) => ({
            moduleId,
            siliconId: rawIds[index] ?? '-'
        }))
    };
}

function parseSerialCommand(line) {
    return (
        parseStatusLine(line) ||
        parseBalancingLine(line) ||
        parseModuleSiliconIdsLine(line) ||
        parseReadingLine(line)
    );
}

module.exports = {
    normalizeLine,
    parseSerialCommand
};
