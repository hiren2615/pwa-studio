import React, { useEffect, useState } from 'react';

import { createTestInstance } from '@magento/peregrine';
import { useMutation } from '@apollo/client';
import { useAppContext } from '@magento/peregrine/lib/context/app';

import { useProduct } from '../useProduct';
import { act } from 'react-test-renderer';

jest.mock('react', () => {
    const React = jest.requireActual('react');
    const spy = jest.spyOn(React, 'useState');

    return {
        ...React,
        useState: spy
    };
});

jest.mock('@apollo/client', () => {
    const ApolloClient = jest.requireActual('@apollo/client');

    const spy = jest.spyOn(ApolloClient, 'useMutation');
    spy.mockImplementation(() => [
        jest.fn(),
        {
            data: {},
            loading: false,
            error: null
        }
    ]);

    return {
        ApolloClient,
        useMutation: spy
    };
});

jest.mock('@magento/peregrine/lib/context/app', () => {
    const state = {
        drawer: null
    };
    const api = { toggleDrawer: jest.fn() };
    const useAppContext = jest.fn(() => [state, api]);

    return { useAppContext };
});

jest.mock('@magento/peregrine/lib/context/cart', () => {
    const state = {
        cartId: 'cart123'
    };
    const api = {};
    const useCartContext = jest.fn(() => [state, api]);

    return { useCartContext };
});

const props = {
    item: {
        prices: {
            price: {
                value: 99,
                currency: 'USD'
            }
        },
        product: {
            name: 'unit test',
            small_image: {
                url: 'test.webp'
            }
        },
        quantity: 7,
        id: 'ItemID'
    },
    mutations: {
        removeItemMutation: '',
        updateItemQuantityMutation: ''
    },
    setActiveEditItem: jest.fn(),
    setIsCartUpdating: jest.fn()
};

const log = jest.fn();
const Component = props => {
    const talonProps = useProduct({ ...props });

    useEffect(() => {
        log(talonProps);
    }, [talonProps]);

    return <i talonProps={talonProps} />;
};

test('it returns the proper shape', () => {
    // Arrange.
    useMutation.mockReturnValueOnce([jest.fn(), {}]);
    useMutation.mockReturnValueOnce([jest.fn(), {}]);

    // Act.
    createTestInstance(<Component {...props} />);

    // Assert.
    expect(log).toHaveBeenCalledWith({
        errorMessage: '',
        handleEditItem: expect.any(Function),
        handleRemoveFromCart: expect.any(Function),
        handleToggleFavorites: expect.any(Function),
        handleUpdateItemQuantity: expect.any(Function),
        isEditable: expect.any(Boolean),
        isFavorite: expect.any(Boolean),
        product: expect.any(Object)
    });
});

test('it returns the correct error message when the error is not graphql', async () => {
    expect.assertions(1);

    // Arrange.
    useMutation.mockReturnValueOnce([jest.fn(), {}]);
    useMutation.mockReturnValueOnce([
        jest.fn().mockRejectedValue(new Error('nope')),
        { error: new Error('test!') }
    ]);

    useState.mockReturnValueOnce([false, jest.fn()]);
    useState.mockReturnValueOnce([true, jest.fn()]);

    // Act.
    const tree = createTestInstance(<Component {...props} />);
    const { root } = tree;
    const { talonProps } = root.findByType('i').props;

    expect(talonProps.errorMessage).toBe('test!');
});

test('it returns the correct error message when the error is graphql', () => {
    // Arrange.
    useMutation.mockReturnValueOnce([jest.fn(), {}]);
    useMutation.mockReturnValueOnce([
        jest.fn(),
        {
            error: {
                graphQLErrors: [new Error('test a'), new Error('test b')]
            }
        }
    ]);

    useState.mockReturnValueOnce([false, jest.fn()]);
    useState.mockReturnValueOnce([true, jest.fn()]);

    // Act.
    const tree = createTestInstance(<Component {...props} />);
    const { root } = tree;
    const { talonProps } = root.findByType('i').props;

    // Assert.
    expect(talonProps.errorMessage).toBe('test a, test b');
});

test('it resets cart updating flag on unmount', () => {
    const setIsCartUpdating = jest.fn();

    const tree = createTestInstance(
        <Component {...props} setIsCartUpdating={setIsCartUpdating} />
    );

    expect(setIsCartUpdating).not.toBeCalled();

    tree.unmount();

    expect(setIsCartUpdating).toHaveBeenCalledWith(false);
});

test('it tells the cart when a mutation is in flight', () => {
    useMutation.mockReturnValueOnce([
        jest.fn(),
        {
            called: true,
            loading: true
        }
    ]);
    useMutation.mockReturnValueOnce([jest.fn(), {}]);

    const setIsCartUpdating = jest.fn();

    createTestInstance(
        <Component {...props} setIsCartUpdating={setIsCartUpdating} />
    );

    expect(setIsCartUpdating).toHaveBeenCalledWith(true);
});

test('it provides a way to toggle favorites', () => {
    const tree = createTestInstance(<Component {...props} />);

    const { root } = tree;
    const { talonProps } = root.findByType('i').props;

    expect(talonProps.isFavorite).toBeFalsy();

    const { handleToggleFavorites } = talonProps;

    act(() => {
        handleToggleFavorites();
    });

    const { talonProps: updatedProps } = tree.root.findByType('i').props;
    expect(updatedProps.isFavorite).toBeTruthy();
});

test('it handles editing the product', () => {
    const mockToggleDrawer = jest.fn();
    useAppContext.mockReturnValue([
        { drawer: null },
        { toggleDrawer: mockToggleDrawer }
    ]);

    const setActiveEditItem = jest.fn();
    const tree = createTestInstance(
        <Component {...props} setActiveEditItem={setActiveEditItem} />
    );

    const { root } = tree;
    const { talonProps } = root.findByType('i').props;

    const { handleEditItem } = talonProps;

    act(() => {
        handleEditItem();
    });

    expect(mockToggleDrawer).toHaveBeenCalledWith('product.edit');
    expect(setActiveEditItem).toHaveBeenCalled();
    expect(setActiveEditItem.mock.calls[1][0]).toMatchInlineSnapshot(`
        Object {
          "id": "ItemID",
          "prices": Object {
            "price": Object {
              "currency": "USD",
              "value": 99,
            },
          },
          "product": Object {
            "name": "unit test",
            "small_image": Object {
              "url": "test.webp",
            },
          },
          "quantity": 7,
        }
    `);
});

describe('it handles cart removal', () => {
    test('with no errors', () => {
        const removeItem = jest.fn();
        useMutation.mockReturnValueOnce([removeItem, {}]);
        useMutation.mockReturnValueOnce([jest.fn(), {}]);
        const tree = createTestInstance(<Component {...props} />);

        const { root } = tree;
        const { talonProps } = root.findByType('i').props;

        const { handleEditItem, handleRemoveFromCart } = talonProps;

        act(() => {
            handleEditItem();
            handleRemoveFromCart();
        });

        expect(removeItem).toHaveBeenCalled();
        expect(removeItem.mock.calls[0][0]).toMatchInlineSnapshot(`
            Object {
              "variables": Object {
                "cartId": "cart123",
                "itemId": "ItemID",
              },
            }
        `);
    });

    test('with a thrown error', () => {
        const error = new Error('Item removal error');
        const removeItem = jest.fn(() => {
            throw error;
        });
        //First render
        useMutation.mockReturnValueOnce([removeItem, {}]);
        useMutation.mockReturnValueOnce([jest.fn(), {}]);
        //Second render
        useMutation.mockReturnValueOnce([
            removeItem,
            {
                called: true,
                error: error,
                loading: false
            }
        ]);
        useMutation.mockReturnValueOnce([jest.fn(), {}]);

        const tree = createTestInstance(<Component {...props} />);

        const { root } = tree;
        const { talonProps } = root.findByType('i').props;

        expect(talonProps.errorMessage).toBeFalsy();

        const { handleRemoveFromCart } = talonProps;

        act(() => {
            handleRemoveFromCart();
        });

        const { talonProps: updatedProps } = tree.root.findByType('i').props;

        expect(updatedProps.errorMessage).toBeTruthy();
    });
});

describe('it handles item quantity updates', () => {
    test('with no errors', () => {
        const updateItemQuantity = jest.fn();
        useMutation.mockReturnValueOnce([jest.fn(), {}]);
        useMutation.mockReturnValueOnce([updateItemQuantity, {}]);
        const tree = createTestInstance(<Component {...props} />);

        const { root } = tree;
        const { talonProps } = root.findByType('i').props;

        const { handleUpdateItemQuantity } = talonProps;

        act(() => {
            handleUpdateItemQuantity(100);
        });

        expect(updateItemQuantity).toHaveBeenCalled();
        expect(updateItemQuantity.mock.calls[0][0]).toMatchInlineSnapshot(`
            Object {
              "variables": Object {
                "cartId": "cart123",
                "itemId": "ItemID",
                "quantity": 100,
              },
            }
        `);
    });

    test('with a thrown error', () => {
        const error = new Error('Item quantity update error');
        const updateItemQuantity = jest.fn(() => {
            throw error;
        });
        //First render
        useMutation.mockReturnValueOnce([jest.fn(), {}]);
        useMutation.mockReturnValueOnce([updateItemQuantity, {}]);
        //Second renderer
        useMutation.mockReturnValueOnce([jest.fn(), {}]);
        useMutation.mockReturnValueOnce([
            updateItemQuantity,
            {
                called: true,
                error: error,
                loading: false
            }
        ]);

        const tree = createTestInstance(<Component {...props} />);

        const { root } = tree;
        const { talonProps } = root.findByType('i').props;

        expect(talonProps.errorMessage).toBeFalsy();

        const { handleUpdateItemQuantity } = talonProps;

        act(() => {
            handleUpdateItemQuantity(100);
        });

        const { talonProps: updatedProps } = tree.root.findByType('i').props;

        expect(updatedProps.errorMessage).toBeTruthy();
    });
});

test('it does not set the active edit item when drawer is open', () => {
    useAppContext.mockReturnValue([
        { drawer: 'search.filter' },
        { toggleDrawer: jest.fn() }
    ]);

    const setActiveEditItem = jest.fn();
    createTestInstance(
        <Component {...props} setActiveEditItem={setActiveEditItem} />
    );

    expect(setActiveEditItem).not.toHaveBeenCalled();
});
