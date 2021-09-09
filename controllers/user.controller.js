const utilHelper = require("../helpers/utils.helper");
const Cart = require("../models/cart");
const Order = require("../models/order");
const User = require("../models/user");

const userController = {};


userController.getProfile = async (req,res,next)=> {
    try {
        let id = req.params.id
        let user = await User.findById(id)
        .populate({
            path: 'cart', 
            match: { isDeleted: false },
            populate: {
                path: 'product'
        }})
        .populate({
            path: 'schedule',
            populate: {
                path: 'service'
            }
        })
        .populate({
            path: 'order',
            populate: {
                path: 'order', select: ['product', 'quantity']
            }
        })
        .populate('pet');

        utilHelper.sendResponse(
            res,
            200,
            true,
            {user},
            null,
            "Get single profile successfully."
        )
    } catch (error) {
        next(error)
    }
};

userController.addToCart = async(req,res,next)=> {
    try {
        let productId = req.params.id;
        let { quantity } = req.body;
        let user = await User.findById(req.userId)
        let cartId = '';
          
        // check if there is duplicated product
        let duplicatedProduct = await Cart.find({owner: req.userId, product: productId});
        if (duplicatedProduct.length) {
            cartId = duplicatedProduct[0]._id;
            if (quantity<=0) {
                //remove the product if quantity = 0
                user.cart.splice(user.cart.indexOf(cartId), 1);
                await Cart.findByIdAndDelete(cartId);
            } else {
                //update the quantity if that product has been in cart already & quantity > 0
                await Cart.findByIdAndUpdate(cartId, {quantity: quantity});
            }
        } else {
            // create new cart if there is no duplication
           let cart = await Cart.create({
               owner: req.userId,
               product: productId,
               quantity: quantity
           })
           cartId = cart._id;
           user.cart.push(cartId);
        }
        await user.save();
        let cart = await Cart.findById(cartId)
        .populate('product');

        utilHelper.sendResponse(
            res,
            200,
            true,
            {cart},
            null,
            "Update cart successfully."
        )
    } catch (error) {
        next(error)
    }
}


userController.deleteCart = async(req,res,next) => {
    try {
        await Cart.deleteMany({owner: req.userId});
        await User.findByIdAndUpdate(req.userId, {cart: []});
        utilHelper.sendResponse(
            res,
            200,
            true,
            null,
            null,
            "Cart deleted."
        )
    } catch (error) {
        next(error)
    }
}


userController.order= async(req,res,next) =>{
    try {
        let cart = await Cart.find({owner: req.userId})
        .populate('product');

        if (cart.length) {
        let totalCost = 0;
        cart.map((c) => totalCost+= c.product.price*c.quantity);
        let {
            address,
            phone
        } = req.body;

        let order = await Order.create({
            owner: req.userId,
            order: cart,
            address,
            phone,
            totalCost
        });

        let orderId = order._id;
        let newOrder = await Order.findById(orderId)
        .populate({
            path: 'order',
            populate: {
                path: 'product'
            }
        });
        
        //update in user data
        let user = await User.findById(req.userId);
        user.order.push(orderId);
        await user.save();
        
        //delete cart
        await Cart.updateMany({owner: req.userId}, {isDeleted: true});
        // await User.findByIdAndUpdate(req.userId, {cart: []});

        utilHelper.sendResponse(
            res,
            200,
            true,
            {newOrder},
            null,
            "Created new order."
        )} else next()
    } catch (error) {
        next(error)
    }
}


userController.deleteOrder= async (req,res,next) => {
    try {
        let orderId = req.params.id;
        await Order.findByIdAndDelete(orderId);

        //update in user data
        let user = await User.findById(req.userId);
        user.order.splice(user.order.indexOf(orderId), 1);
        await user.save();

        utilHelper.sendResponse(
            res,
            200,
            true,
            null,
            null,
            "Order deleted."
        )
    } catch (error) {
        next(error)
    }
}


userController.payment= async(req,res,next) => {
    try {
        let orderId = req.params.id;
        let paid = await Order.findByIdAndUpdate(orderId, {isPaid: true})
        .populate('order', ['product', 'quantity']);
        
        //update user's point
        let order = await Order.findById(orderId);
        let totalCost = order.totalCost;
        utilHelper.updatePoint(req.userId, totalCost);
        
        utilHelper.sendResponse(
            res,
            200,
            true,
            {paid},
            null,
            "Your order has been paid."
        )
    } catch (error) {
        next(error)
    }
}

module.exports = userController