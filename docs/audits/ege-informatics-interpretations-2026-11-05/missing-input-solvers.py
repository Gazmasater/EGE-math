"""Solve the two remaining tasks only when their actual numeric input is supplied.

Usage: python3 missing-input-solvers.py 1F25B2 boxes.txt
       python3 missing-input-solvers.py 7F1EAA occupied-seats.txt
The existing mismatched attachments are rejected, never reinterpreted.
"""
import argparse
from collections import defaultdict
from pathlib import Path


def solve(task, text):
    lines = text.lstrip('\ufeff').strip().splitlines()
    if not lines:
        raise ValueError('Пустой файл')
    try:
        rows = [list(map(int, line.split())) for line in lines]
    except ValueError as error:
        raise ValueError('Нужны целые числа; приложенный буквенный текст не подходит') from error
    if len(rows[0]) != 1 or not 1 <= rows[0][0] <= 10000:
        raise ValueError('Первая строка должна содержать N от 1 до 10000')
    data = rows[1:]
    if len(data) != rows[0][0]:
        raise ValueError('Количество строк не совпадает с N')
    if task == '1F25B2':
        if any(len(row) != 1 or not 1 <= row[0] <= 10000 for row in data):
            raise ValueError('Нужны N строк с одним размером коробки от 1 до 10000')
        chain = []
        for side in sorted((row[0] for row in data), reverse=True):
            if not chain or chain[-1] - side >= 13:
                chain.append(side)
        return len(chain), chain[-1]
    if task != '7F1EAA':
        raise ValueError('Неизвестное задание')
    if any(len(row) != 2 or any(not 1 <= value <= 100000 for value in row) for row in data):
        raise ValueError('Нужны N пар «номер ряда, номер занятого места»')
    occupied = defaultdict(set)
    for row, seat in data:
        occupied[row].add(seat)
    for row in sorted(occupied, reverse=True):
        seats = sorted(occupied[row])
        for left, right in zip(seats, seats[1:]):
            if right - left == 3:
                return row, left + 1
    raise ValueError('Нет гарантированной условием пары свободных мест')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('task', choices=['1F25B2', '7F1EAA'])
    parser.add_argument('file', type=Path)
    args = parser.parse_args()
    try:
        print(*solve(args.task, args.file.read_text(encoding='utf-8-sig')))
    except (ValueError, OSError) as error:
        parser.exit(2, str(error) + '\n')
