#!/usr/bin/env python3
import sys

def invert_braille(text: str) -> str:
    out = []
    for ch in text:
        code = ord(ch)
        if 0x2800 <= code <= 0x28FF:
            offset = code - 0x2800
            out.append(chr(0x28FF - offset))
        else:
            out.append(ch)
    return ''.join(out)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            text = f.read()
    else:
        text = sys.stdin.read()

    result = invert_braille(text)

    if len(sys.argv) > 2:
        with open(sys.argv[2], "w", encoding="utf-8") as f:
            f.write(result)
        print(f"已写入：{sys.argv[2]}")
    else:
        sys.stdout.write(result)