import asyncio

try:                                  # 浏览器（Pyodide）里由页面提供异步输入
    from js import ask
except ImportError:                   # 真终端里退回内置 input
    async def ask(prompt=""):
        return input(prompt)


class chess:
    max_hight = 0
    max_lenth = 0
    qizi = [] # 高度/宽度/0白1黑
    this_turn_is_black = True

    def get_now_name(this) -> str:
        if(this.this_turn_is_black):
            return "黑方"
        else:
            return "白方"

    def get_now_id(this) -> int:
        if(this.this_turn_is_black):
            return 1
        else:
            return 0

    def switch(this):
        if(this.this_turn_is_black):
            this.this_turn_is_black = False
        else:
            this.this_turn_is_black = True

    def print_len(target_hight:int, target_len:int):
        if(target_len > 25):print("暂不支持绘制边长大于26的棋盘")
        if(target_hight >= 9):
            to_print = "   "
        else:
            to_print = "  "
        string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        lenth = 0
        while(lenth <= target_len):
            to_print = to_print + string[lenth] + " "
            lenth = lenth + 1
        print(to_print)

    def print(this):
        target_hight = this.max_hight
        target_lenth = this.max_lenth
        if(target_lenth > 25 or target_hight > 25):print("暂不支持绘制边长大于26的棋盘")
        hight = 0
        lenth = 0
        white = "●"
        black = "○"
        none = "+"
        select = "⊕"
        select_white = "◉"
        select_black = "◎"
        this.print_len(target_hight, target_lenth)
        while(hight <= target_hight):
            lenth = 0
            to_print = str(hight + 1)
            if(target_hight >= 9 and hight < 9):
                to_print = to_print + "  "
            else:
                to_print = to_print + " "
            while(lenth <= target_lenth):
                charact = none
                for i in this.qizi:
                    if(i[0] == hight and i[1] == lenth):
                        if(i[2] == 0): 
                            if(this.qizi.index(i) == this.qizi.__len__() - 1):
                                charact = select_white
                            else:
                                charact = white
                        else: 
                            if(this.qizi.index(i) == this.qizi.__len__() - 1):
                                charact = select_black
                            else:
                                charact = black
                to_print = to_print + charact + " "
                lenth = lenth + 1
            print(to_print)
            hight = hight + 1

    def resolve(this,user_input:str):
        global err_msg
        down = [int, int, this.get_now_id(this)]
        user_input = user_input.replace(user_input[0], user_input[0].upper())
        resolved_lenth = string.find(user_input[0])
        if(resolved_lenth == -1):
            err_msg = "列位置错误"
            return
        else:
            down[1] = resolved_lenth
            try:
                resolved_hight = int(user_input.split(string[resolved_lenth])[1])
                if(0 > resolved_hight - 1 or resolved_hight - 1 > this.max_hight):
                    err_msg = "行位置错误"
                    return
                down[0] = resolved_hight - 1
                for i in this.qizi:
                    if(i[0] == down[0] and i[1] == down[1]):
                        err_msg = "的位置已被占"
                        return
                err_msg = "成功"
                this.qizi.append(down)
                return
            except ValueError:
                err_msg = "行位置错误"
                return

    def check_face(this, hight:int, lenth:int, x:int, y:int):
        continue_check = True
        last = [x, y]
        connected = 0
        while(continue_check):
            if(connected == 4): return True
            last = [last[0] + hight, last[1] + lenth , this.get_now_id(this)]
            if(last in this.qizi):
                connected = connected + 1
            else:
                continue_check = False
                break
        return False

    def check_all(this):
        for i in this.qizi:
            if(i[2] == this.get_now_id(this)):
                for j in [-1, 0, 1]:
                    for k in [-1, 0, 1]:
                        if(not (j, k) == (0, 0)):
                            if(this.check_face(this, j, k, i[0], i[1])):
                                return True
        return False

Chess = chess
Chess.max_hight = 14
Chess.max_lenth = 14
string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
err_msg = "未行动"


async def main():
    global err_msg
    while(True):
        if(err_msg == "成功"):
            Chess.switch(Chess)
        now_name = Chess.get_now_name(Chess)
        selectsite = [int, int, 1]
        user_input = ""
        print("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n")
        Chess.print(Chess)
        print("上一步" + err_msg)
        try:
            user_input = await ask("当前" + now_name + "下")
        except KeyboardInterrupt:
            print("棍母")
            exit(0)
        Chess.resolve(Chess,user_input)
        if(Chess.check_all(Chess)):
            Chess.print(Chess)
            print(now_name + "赢了！")
            exit(0)


asyncio.run(main())