export const LANGUAGES = [
    {
        value: 'javascript',
        label: 'JavaScript',
        defaultCode: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const lines = [];
rl.on('line', (line) => lines.push(line));
rl.on('close', () => {
  const name = lines[0] || 'World';
  console.log('Hello, ' + name + '!');
});`,
        inputHint: 'e.g. Alice',
    },
    {
        value: 'python',
        label: 'Python',
        defaultCode: `name = input("Enter your name: ")
print(f"Hello, {name}!")`,
        inputHint: 'e.g. Alice',
    },
    {
        value: 'java',
        label: 'Java',
        defaultCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String name = sc.nextLine();
        System.out.println("Hello, " + name + "!");
    }
}`,
        inputHint: 'e.g. Alice',
    },
    {
        value: 'cpp',
        label: 'C++',
        defaultCode: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    cin >> name;
    cout << "Hello, " << name << "!" << endl;
    return 0;
}`,
        inputHint: 'e.g. Alice',
    },
    {
        value: 'c',
        label: 'C',
        defaultCode: `#include <stdio.h>

int main() {
    char name[100];
    scanf("%s", name);
    printf("Hello, %s!\\n", name);
    return 0;
}`,
        inputHint: 'e.g. Alice',
    },
];

export const THEMES = [
    { value: 'vs-dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'hc-black', label: 'High Contrast' },
];
