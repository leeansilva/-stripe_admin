'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Select,
  Button,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Card,
  CardBody,
  CardHeader,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Badge,
  Spinner,
  Grid,
  GridItem,
  useToast,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
} from '@chakra-ui/react';
import {
  FiDollarSign,
  FiShoppingCart,
  FiCalendar,
  FiCheckCircle,
  FiSearch,
  FiCopy,
  FiExternalLink,
  FiRefreshCw
} from 'react-icons/fi';

interface Product {
  id: string;
  name: string;
  description: string | null;
  images: string[];
}

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  interval: string;
  interval_count: number;
}

interface SessionHistory {
  id: string;
  productName: string;
  price: number;
  currency: string;
  paymentsCount: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  checkoutUrl?: string; // URL del link de pago
}

/** Cantidad de pagos según el nombre del producto (fijado por producto) */
function getExpectedPaymentsCount(productName: string): number {
  if (!productName) return 1;
  if (productName === 'Developer/Data Engineer - Online mentorship / Sesion 1 - 1') return 1;
  if (productName === 'Developer/Data Engineer - Online mentorship / Online Course / Curso Online') return 1;
  if (productName.endsWith(' - 2 Pagos')) return 2;
  if (productName.endsWith(' - 3 Pagos')) return 3;
  if (productName.endsWith(' - 4 Pagos')) return 4;
  return 1;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [paymentsCount, setPaymentsCount] = useState<number>(1);
  const [useManualPrice, setUseManualPrice] = useState<boolean>(true);
  const [manualPrice, setManualPrice] = useState<string>('');
  const currency = 'usd'; // Siempre USD
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState<string>('');
  const [sessionHistory, setSessionHistory] = useState<SessionHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [generatedLink, setGeneratedLink] = useState<{ url: string; sessionId: string } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copiado',
        description: 'Link copiado al portapapeles',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar al portapapeles',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Cerrar el dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchOpen]);

  // Cargar historial desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('stripe_sessions');
    if (saved) {
      try {
        setSessionHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Error al cargar historial:', e);
      }
    }
  }, []);

  // Cargar productos al montar el componente
  useEffect(() => {
    loadProducts();
  }, []);

  // Al cambiar de producto: limpiar link generado (cada link es por producto)
  useEffect(() => {
    setGeneratedLink(null);
  }, [selectedProductId]);

  // Fijar cantidad de pagos según el producto seleccionado
  useEffect(() => {
    if (selectedProductId && products.length > 0) {
      const product = products.find((p) => p.id === selectedProductId);
      if (product) setPaymentsCount(getExpectedPaymentsCount(product.name));
    }
  }, [selectedProductId, products]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      if (response.ok) {
        // Quitar duplicados por nombre (mismo nombre, distinto id en Stripe)
        const seenNames = new Set<string>();
        const uniqueProducts = (data.products as Product[]).filter((p) => {
          if (seenNames.has(p.name)) return false;
          seenNames.add(p.name);
          return true;
        });
        setProducts(uniqueProducts);
        if (uniqueProducts.length === 0) {
          setError('No hay productos disponibles. Crea productos en el Dashboard de Stripe.');
        }
      } else {
        setError(data.error || 'Error al cargar productos');
        toast({
          title: 'Error',
          description: data.error || 'Error al cargar productos',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
      toast({
        title: 'Error de conexión',
        description: 'No se pudo conectar con el servidor',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCheckout = async () => {
    // Validar que haya precio manual
    if (!manualPrice || parseFloat(manualPrice) <= 0) {
      setError('Por favor ingresa un precio válido');
      return;
    }
    // Requerir que haya un producto seleccionado
    if (!selectedProductId) {
      setError('Por favor selecciona un producto');
      return;
    }

    if (paymentsCount < 1) {
      setError('La cantidad de pagos debe ser al menos 1');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const selectedProduct = products.find((p) => p.id === selectedProductId);
      const priceInCents = Math.round(parseFloat(manualPrice) * 100);

      const requestBody: any = {
        paymentsCount,
        manualPrice: priceInCents,
        currency: currency,
        productId: selectedProductId,
      };

      if (selectedProduct && paymentsCount === 1) {
        requestBody.productName = selectedProduct.name;
      }

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Guardar en historial
        const pricePerPayment = priceInCents;
        const sessionPaymentsCount = paymentsCount;
        const sessionCurrency = currency;
        const productName = selectedProduct?.name || 'Pago Manual';

        const newSession: SessionHistory = {
          id: data.sessionId || Date.now().toString(),
          productName,
          price: pricePerPayment, // Precio por cuota
          currency: sessionCurrency,
          paymentsCount: sessionPaymentsCount,
          date: new Date().toISOString(),
          status: 'pending',
          checkoutUrl: data.url, // Guardar el link
        };

        const updatedHistory = [newSession, ...sessionHistory].slice(0, 10); // Mantener solo los últimos 10
        setSessionHistory(updatedHistory);
        localStorage.setItem('stripe_sessions', JSON.stringify(updatedHistory));

        // Mostrar el link en lugar de redirigir
        setGeneratedLink({
          url: data.url,
          sessionId: data.sessionId || '',
        });

        toast({
          title: 'Link generado exitosamente',
          description: 'Copia el link o haz click para ir a Stripe',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        setLoading(false);
      } else {
        setError(data.error || 'Error al crear sesión de pago');
        toast({
          title: 'Error',
          description: data.error || 'Error al crear sesión de pago',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setLoading(false);
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
      toast({
        title: 'Error de conexión',
        description: 'No se pudo conectar con el servidor',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Calcular precio por cuota
  let amountPerPayment = 0;
  let totalAmount = 0;
  let displayCurrency = 'usd';

  if (manualPrice) {
    amountPerPayment = Math.round(parseFloat(manualPrice) * 100);
    totalAmount = amountPerPayment * paymentsCount; // N según producto
    displayCurrency = currency;
  }

  const totalSessions = sessionHistory.length;

  // Filtrar productos basado en la búsqueda
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Container maxW="6xl" py={8} position="relative" overflow="visible">
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="2xl" mb={2} color="brand.600">
            Stripe Admin
          </Heading>
          <Text color="gray.600" fontSize="lg">
            Sistema de suscripciones con cantidad de pagos limitada
          </Text>
        </Box>

        {/* Estadísticas */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FiShoppingCart} />
                    <Text>Productos Disponibles</Text>
                  </HStack>
                </StatLabel>
                <StatNumber>{products.length}</StatNumber>
                <StatHelpText>Total de productos activos</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FiCalendar} />
                    <Text>Sesiones Creadas</Text>
                  </HStack>
                </StatLabel>
                <StatNumber>{totalSessions}</StatNumber>
                <StatHelpText>Últimas 10 sesiones</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          {amountPerPayment > 0 && (
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>
                    <HStack>
                      <Icon as={FiDollarSign} />
                      <Text>Valor por Cuota</Text>
                    </HStack>
                  </StatLabel>
                  <StatNumber fontSize="xl">
                    {formatPrice(amountPerPayment, displayCurrency)}
                  </StatNumber>
                  <StatHelpText>
                    {paymentsCount} pago{paymentsCount > 1 ? 's' : ''} de{' '}
                    {formatPrice(amountPerPayment, displayCurrency)} cada uno
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          )}
        </Grid>

        {/* Error Alert */}
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Formulario Principal */}
        <Card overflow="visible">
          <CardHeader>
            <Heading size="md">Crear Link de Pago</Heading>
          </CardHeader>
          <CardBody position="relative" overflow="visible">
            <VStack spacing={6} align="stretch">
              {/* Selector de Producto con Búsqueda */}
              <Box position="relative" ref={searchRef} zIndex={10}>
                <Text fontWeight="semibold" mb={2}>
                  Selecciona un Plan
                </Text>
                {loadingProducts ? (
                  <HStack>
                    <Spinner size="sm" />
                    <Text>Cargando productos...</Text>
                  </HStack>
                ) : (
                  <>
                    <InputGroup size="lg">
                      <InputLeftElement pointerEvents="none">
                        <Icon as={FiSearch} color="gray.400" />
                      </InputLeftElement>
                      <Input
                        placeholder="Buscar plan o seleccionar de la lista..."
                        value={
                          selectedProduct
                            ? selectedProduct.name
                            : searchQuery
                        }
                        onChange={(e) => {
                          // Si hay un producto seleccionado y el usuario empieza a escribir, limpiar la selección
                          if (selectedProduct && e.target.value !== selectedProduct.name) {
                            setSelectedProductId('');
                          }
                          setSearchQuery(e.target.value);
                          setIsSearchOpen(true);
                        }}
                        onFocus={() => {
                          setIsSearchOpen(true);
                          // Si hay un producto seleccionado, limpiarlo al hacer focus para permitir búsqueda
                          if (selectedProduct) {
                            setSelectedProductId('');
                            setSearchQuery('');
                          }
                        }}
                        onClick={() => setIsSearchOpen(true)}
                      />
                    </InputGroup>

                    {/* Lista desplegable de resultados */}
                    {isSearchOpen && !selectedProduct && (
                      <Box
                        position="absolute"
                        top="100%"
                        left={0}
                        right={0}
                        zIndex={9999}
                        mt={1}
                        bg="white"
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="md"
                        boxShadow="xl"
                        maxH="500px"
                        minH="200px"
                        overflowY="auto"
                        overflowX="hidden"
                      >
                        {filteredProducts.length === 0 ? (
                          <Box p={4} textAlign="center" color="gray.500">
                            <Text>No se encontraron productos</Text>
                          </Box>
                        ) : (
                          <VStack spacing={0} align="stretch">
                            {filteredProducts.map((product) => (
                              <Box
                                key={product.id}
                                as="button"
                                onClick={() => {
                                  setSelectedProductId(product.id);
                                  setSearchQuery('');
                                  setIsSearchOpen(false);
                                }}
                                _hover={{ bg: 'gray.100' }}
                                _active={{ bg: 'gray.200' }}
                                py={3}
                                px={4}
                                textAlign="left"
                                w="100%"
                                borderBottom="1px solid"
                                borderColor="gray.200"
                                cursor="pointer"
                                _last={{ borderBottom: 'none' }}
                              >
                                <VStack align="start" spacing={1} w="100%">
                                  <Text fontWeight="semibold">
                                    {product.name}
                                  </Text>
                                  {product.description && (
                                    <Text fontSize="sm" color="gray.600" noOfLines={1}>
                                      {product.description}
                                    </Text>
                                  )}
                                </VStack>
                              </Box>
                            ))}
                          </VStack>
                        )}
                      </Box>
                    )}
                  </>
                )}
                {selectedProduct && selectedProduct.description && (
                  <Text mt={2} color="gray.600" fontSize="sm">
                    {selectedProduct.description}
                  </Text>
                )}
                {selectedProduct && (
                  <Button
                    size="sm"
                    variant="ghost"
                    mt={2}
                    onClick={() => {
                      setSelectedProductId('');
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                  >
                    Limpiar selección
                  </Button>
                )}
              </Box>

              {/* Campos de Precio Manual */}
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="semibold" mb={2}>
                    Precio por Cuota
                  </Text>
                  <InputGroup size="lg">
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiDollarSign} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type="text"
                      placeholder="0.00"
                      value={manualPrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Permitir solo números y un punto decimal
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setManualPrice(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                          e.preventDefault();
                        }
                      }}
                    />
                  </InputGroup>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    Este será el valor de cada cuota (no se divide)
                  </Text>
                </Box>
                {manualPrice && parseFloat(manualPrice) > 0 && (
                  <Box p={4} bg="blue.50" borderRadius="md">
                    <VStack align="stretch" spacing={2}>
                      <HStack justify="space-between">
                        <Text fontWeight="semibold">Precio por Cuota:</Text>
                        <Text fontSize="xl" fontWeight="bold" color="brand.600">
                          {new Intl.NumberFormat('es-ES', {
                            style: 'currency',
                            currency: currency.toUpperCase(),
                          }).format(parseFloat(manualPrice) || 0)}
                        </Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontWeight="semibold">Total ({paymentsCount} cuota{paymentsCount > 1 ? 's' : ''}):</Text>
                        <Text fontSize="lg" fontWeight="bold" color="brand.600">
                          {new Intl.NumberFormat('es-ES', {
                            style: 'currency',
                            currency: currency.toUpperCase(),
                          }).format((parseFloat(manualPrice) || 0) * paymentsCount)}
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                )}
              </VStack>

              {/* Cantidad de Pagos (fijada por producto, no editable) */}
              {selectedProductId && (
                <Box>
                  <Text fontWeight="semibold" mb={2}>
                    Cantidad de Pagos
                  </Text>
                  <Select
                    value={paymentsCount}
                    size="lg"
                    isDisabled
                  >
                    <option value={1}>1 pago</option>
                    <option value={2}>2 pagos</option>
                    <option value={3}>3 pagos</option>
                    <option value={4}>4 pagos</option>
                  </Select>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    Definido por el producto seleccionado (no editable).
                  </Text>
                </Box>
              )}

              {/* Botón de Pago */}
              {!generatedLink && (
                <Button
                  colorScheme="brand"
                  size="lg"
                  width="full"
                  onClick={handleCheckout}
                  isLoading={loading}
                  loadingText="Creando sesión..."
                  leftIcon={<Icon as={FiCheckCircle} />}
                >
                  Crear Link de Pago
                </Button>
              )}

              {/* Mostrar Link Generado */}
              {generatedLink && (
                <Card bg="green.50" borderColor="green.200">
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <Box>
                        <Text fontWeight="semibold" mb={2} color="green.700">
                          Link de Pago Generado
                        </Text>
                        <InputGroup size="lg">
                          <Input
                            value={generatedLink.url}
                            readOnly
                            bg="white"
                            fontFamily="mono"
                            fontSize="sm"
                            pr="20"
                          />
                          <InputRightElement width="auto" pr={2}>
                            <Button
                              h="1.75rem"
                              size="sm"
                              onClick={() => copyToClipboard(generatedLink.url)}
                              leftIcon={<Icon as={FiCopy} />}
                              colorScheme="green"
                            >
                              Copiar
                            </Button>
                          </InputRightElement>
                        </InputGroup>
                      </Box>
                      <HStack spacing={3}>
                        <Button
                          colorScheme="green"
                          leftIcon={<Icon as={FiExternalLink} />}
                          onClick={() => window.open(generatedLink.url, '_blank')}
                          flex={1}
                        >
                          Ir a Stripe Checkout
                        </Button>
                        <Button
                          variant="outline"
                          leftIcon={<Icon as={FiRefreshCw} />}
                          onClick={() => {
                            setGeneratedLink(null);
                            setSelectedProductId('');
                            setSearchQuery('');
                            setPaymentsCount(1);
                            setUseManualPrice(false);
                            setManualPrice('');
                          }}
                        >
                          Generar Otro
                        </Button>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Historial de Sesiones */}
        {sessionHistory.length > 0 && (
          <Card>
            <CardHeader>
              <Heading size="md">Historial Reciente</Heading>
              <Text fontSize="sm" color="gray.600" fontWeight="normal" mt={1}>
                Últimos 10 links generados (guardados en este navegador). No es por tiempo.
              </Text>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                {sessionHistory.map((session) => (
                  <Box
                    key={session.id}
                    p={4}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor="gray.200"
                  >
                    <HStack justify="space-between" mb={2}>
                      <Text fontWeight="semibold">{session.productName}</Text>
                    </HStack>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" color="gray.600">
                        {formatPrice(session.price, session.currency)} × {session.paymentsCount}{' '}
                        pago{session.paymentsCount > 1 ? 's' : ''}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {new Date(session.date).toLocaleDateString('es-ES')}
                      </Text>
                    </HStack>
                    {session.checkoutUrl && (
                      <HStack spacing={2} mt={2}>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Icon as={FiCopy} />}
                          onClick={() => copyToClipboard(session.checkoutUrl!)}
                        >
                          Copiar Link
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Icon as={FiExternalLink} />}
                          onClick={() => window.open(session.checkoutUrl, '_blank')}
                        >
                          Abrir
                        </Button>
                      </HStack>
                    )}
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Container>
  );
}
