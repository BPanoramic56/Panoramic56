print('<table>')
for i in range(10):
    print(f"\t<tr>")
    for j in range(10):
        print(f"\t\t<td id={i}{j}></td>")
    print(f"\t</td>")
print("</table>")
