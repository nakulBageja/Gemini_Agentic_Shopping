"""
Deal Search Function Tools for Gemini Live API
Simple tools that Gemini can call to search for product deals
"""

import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class DealSearchTools:
    """Function calling tools for deal searches"""

    def __init__(self, deals_file: str = "deals.json"):
        """Initialize with deals database"""
        self.deals_file = deals_file
        self.products_data = self._load_deals()

    def _load_deals(self) -> Dict[str, Any]:
        """Load deals from JSON file"""
        try:
            with open(self.deals_file, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load deals: {e}")
            return {"products": []}

    def search_deals(
        self,
        product_name: str,
        current_price: Optional[float] = None,
        store_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Search for deals on a specific product
        This function will be called by Gemini Live API
        """
        try:
            product_name_lower = product_name.lower()
            matching_product = None

            # Find matching product
            for product in self.products_data.get("products", []):
                # Check if product name or keywords match
                if product_name_lower in product["name"].lower():
                    matching_product = product
                    break

                # Check keywords
                for keyword in product.get("keywords", []):
                    if (
                        keyword.lower() in product_name_lower
                        or product_name_lower in keyword.lower()
                    ):
                        matching_product = product
                        break

                if matching_product:
                    break

            if not matching_product:
                return {
                    "success": False,
                    "message": f"No products found matching '{product_name}'",
                    "deals": [],
                }

            # Filter deals
            deals = matching_product.get("deals", [])
            filtered_deals = []

            for deal in deals:
                # Skip if same store as current (if specified)
                if store_name and store_name.lower() in deal["store"].lower():
                    continue

                deal_info = {
                    "store": deal["store"],
                    "price": deal["price"],
                    "url": deal["url"],
                    "savings": 0,
                    "savings_percentage": 0,
                }

                # Calculate savings if current price provided
                if current_price and current_price > deal["price"]:
                    deal_info["savings"] = round(current_price - deal["price"], 2)
                    deal_info["savings_percentage"] = round(
                        (deal_info["savings"] / current_price) * 100, 1
                    )

                filtered_deals.append(deal_info)

            # Sort by price (best deals first)
            filtered_deals.sort(key=lambda x: x["price"])

            return {
                "success": True,
                "product_name": matching_product["name"],
                "current_price": current_price,
                "deals": filtered_deals[:5],  # Top 5 deals
                "total_found": len(filtered_deals),
            }

        except Exception as e:
            logger.error(f"Deal search error: {e}")
            return {
                "success": False,
                "message": f"Error searching for deals: {str(e)}",
                "deals": [],
            }

    def get_best_deals(self, limit: int = 5) -> Dict[str, Any]:
        """
        Get the best deals across all products
        """
        try:
            all_deals = []

            for product in self.products_data.get("products", []):
                product_name = product["name"]
                for deal in product.get("deals", []):
                    all_deals.append(
                        {
                            "product_name": product_name,
                            "store": deal["store"],
                            "price": deal["price"],
                            "url": deal["url"],
                        }
                    )

            # Sort by price
            all_deals.sort(key=lambda x: x["price"])

            return {
                "success": True,
                "message": f"Found {len(all_deals)} deals across all products",
                "deals": all_deals[:limit],
            }

        except Exception as e:
            logger.error(f"Best deals error: {e}")
            return {
                "success": False,
                "message": f"Error getting best deals: {str(e)}",
                "deals": [],
            }

    def get_product_list(self) -> Dict[str, Any]:
        """Get list of available products"""
        try:
            products = []
            for product in self.products_data.get("products", []):
                products.append(
                    {"name": product["name"], "keywords": product["keywords"]}
                )

            return {"success": True, "products": products, "total": len(products)}

        except Exception as e:
            logger.error(f"Product list error: {e}")
            return {
                "success": False,
                "message": f"Error getting product list: {str(e)}",
                "products": [],
            }


# Function schemas for Gemini Live API
FUNCTION_SCHEMAS = [
    {
        "name": "search_deals",
        "description": "Search for better deals on a specific product across different stores",
        "parameters": {
            "type": "object",
            "properties": {
                "product_name": {
                    "type": "string",
                    "description": "Name of the product to search for (e.g., 'PlayStation 5', 'AirPods Pro')",
                },
                "current_price": {
                    "type": "number",
                    "description": "Current price the user mentioned (optional, for calculating savings)",
                },
                "store_name": {
                    "type": "string",
                    "description": "Store name to exclude from results (optional, if user wants alternatives to a specific store)",
                },
            },
            "required": ["product_name"],
        },
    },
    {
        "name": "get_best_deals",
        "description": "Get the best deals across all available products",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of deals to return (default: 5)",
                }
            },
        },
    },
    {
        "name": "get_product_list",
        "description": "Get list of all available products that can be searched",
        "parameters": {"type": "object", "properties": {}},
    },
]


# Global instance
deal_search_tools = DealSearchTools()


def execute_function(function_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a function call from Gemini Live API"""
    try:
        if function_name == "search_deals":
            return deal_search_tools.search_deals(**arguments)
        elif function_name == "get_best_deals":
            return deal_search_tools.get_best_deals(**arguments)
        elif function_name == "get_product_list":
            return deal_search_tools.get_product_list(**arguments)
        else:
            return {"success": False, "message": f"Unknown function: {function_name}"}
    except Exception as e:
        logger.error(f"Function execution error: {e}")
        return {
            "success": False,
            "message": f"Error executing {function_name}: {str(e)}",
        }
