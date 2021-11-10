import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CART_KEY = '@RocketShoes:cart';

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(CART_KEY);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartProduct = cart.find((product) => product.id === productId);
      if (!cartProduct) {
        const { data } = await api.get(`/products/${productId}`);
        const newCart = [...cart, {...data, amount: 1}];
        setCart(newCart);
        localStorage.setItem(CART_KEY, JSON.stringify(newCart));
        return;
      }
      
      const {data} = await api.get<Stock>(`/stock/${productId}`);
      const isAvailableInStock = cartProduct.amount < data.amount;

      if (!isAvailableInStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(item => item.id === productId ? {...item, amount: item.amount + 1} : item)
      setCart(newCart);
      localStorage.setItem(CART_KEY, JSON.stringify(newCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(product => product.id === productId);

      if (productIndex < 0) {
        throw new Error();
      }

      const newCart = [...cart];
      newCart.splice(productIndex, 1);

      setCart(newCart);
      localStorage.setItem(CART_KEY, JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const {data} = await api.get<Stock>(`/stock/${productId}`);
      const isAvailableInStock = amount < data.amount;
      
      if (!isAvailableInStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(product => product.id === productId ? {...product, amount} : product);
      setCart(newCart);
      localStorage.setItem(CART_KEY, JSON.stringify(newCart));

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
