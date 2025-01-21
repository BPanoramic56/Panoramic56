using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Numerics;

namespace CSharpTutorials
{
    class Program
    {
        static void Main(string[] args)
        {
            BigInteger x = Conole.ReadLine();
        }

        private static BigInteger fastMultiply(BigInteger n, BigInteger x, BigInteger y) {
            if (n == BigInteger.One) {
                return x * y;
            } 
            else {
                BigInteger bigIntTwo = BigInteger.Two;
                BigInteger m = n / bigIntTwo;
                BigInteger power = BigPow(BigInteger.Ten, m);
                BigInteger a = x / power;
                BigInteger b = x % power;
                BigInteger c = y / power;
                BigInteger d = y % power;

                BigInteger e = fastMultiply(m, a, c);
                BigInteger f = fastMultiply(m, b, d);
                BigInteger g = fastMultiply(m, a - b, c - d);

                return BigPow(BigInteger.Ten, m * bigIntTwo) * e + power * (e + f - g) + f; // trying it all at once
            }
        }

        private static BigInteger BigPow(BigInteger baseValue, BigInteger exponent) {
            return BigInteger.Pow((int)baseValue, (int)exponent);
        }
    }
}