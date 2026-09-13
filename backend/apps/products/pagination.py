"""
Paginación de la lista de productos.

Permite navegar con ?page=N y aumentar el tamaño de página con ?page_size=N
(hasta 200) para que el cliente pueda consultar todas las productos de una
categoría sin quedar limitado a la primera página.
"""

from rest_framework.pagination import PageNumberPagination


class ProductsPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200